'use client'

import { useEffect, useState, useRef } from 'react'
import { StatusBadge } from './AgentStats'
import CopyButton from './CopyButton'
import Skeleton from './Skeleton'
import { showToast } from './Toast'

type TraceStep = {
  step: number
  name: string
  description: string
  durationMs: number
  details: Record<string, unknown>
}

type JobResultData = {
  id: string
  status: string
  error_msg: string | null
  result: {
    summary: string
    findings: Array<{
      title: string
      description: string
      evidence: string
      confidence: number
      severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
    }>
    riskScore: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
    confidence: number
    reasoning_trace?: {
      steps: TraceStep[]
      totalDurationMs: number
    }
  } | null
  result_hash: string | null
  arc_tx_hash: string | null
  payment_in: number | null
  created_at: string
  completed_at: string | null
}

export default function JobResult({
  jobId,
  onDone,
  onNewAnalysis,
  isDemo,
}: {
  jobId: string
  onDone?: () => void
  onNewAnalysis?: () => void
  isDemo?: boolean
}) {
  const [data, setData] = useState<JobResultData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const prevStatus = useRef<string | null>(null)

  useEffect(() => {
    if (isDemo) {
      fetch('/api/demo').then(r => r.ok ? r.json() : null).then(j => {
        if (j) { setData(j); showToast('🚀 Demo loaded!'); onDone?.() }
      }).catch(() => setError('Demo data unavailable'))
      return
    }

    let cancelled = false

    async function poll() {
      while (!cancelled) {
        try {
          const res = await fetch(`/api/jobs/${jobId}`)
          if (!res.ok) {
            setError('Job not found')
            return
          }
          const job: JobResultData = await res.json()
          prevStatus.current = data?.status ?? null
          setData(job)

          if (job.status === 'COMPLETED' || job.status === 'FAILED') {
            if (job.status === 'COMPLETED') showToast('✅ Analysis completed!')
            else if (job.status === 'FAILED') showToast('❌ Analysis failed')
            onDone?.()
            return
          }
        } catch {
          // retry
        }
        await new Promise((r) => setTimeout(r, 2000))
      }
    }

    poll()
    return () => { cancelled = true }
  }, [jobId, isDemo]) // eslint-disable-line react-hooks/exhaustive-deps

  if (error) {
    return (
      <div className="glass-card rounded-xl p-5">
        <p className="text-danger text-sm">{error}</p>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="glass-card rounded-xl p-5 space-y-3">
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-4 w-16 rounded-full" />
        </div>
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
    )
  }

  const justCompleted = prevStatus.current && prevStatus.current !== 'COMPLETED' && data.status === 'COMPLETED'

  return (
    <div
      className={`glass-card rounded-xl overflow-hidden animate-[fade-in_0.3s_ease-out]`}
    >
      <div className="px-5 py-4 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h3 className="text-sm font-medium text-foreground">Analysis Result</h3>
          <StatusBadge status={data.status} />
        </div>
        {data.result && (
          <RiskBadge score={data.result.riskScore} />
        )}
      </div>

      <div className="p-5 space-y-5">
        {data.status === 'FAILED' ? (
          <div className="bg-danger/10 border border-danger/20 rounded-lg px-4 py-3">
            <p className="text-sm text-danger">{data.error_msg ?? 'Analysis failed'}</p>
          </div>
        ) : data.result ? (
          <div className={`space-y-5 ${justCompleted ? 'animate-[fade-in_0.4s_ease-out]' : ''}`}>
            <div>
              <p className="text-sm text-foreground leading-relaxed">{data.result.summary}</p>
              <p className="text-xs text-muted mt-1.5">
                Overall confidence: <span className="text-accent font-mono">{data.result.confidence}%</span>
              </p>
            </div>

            <div className="space-y-3">
              <h4 className="text-xs font-medium text-muted uppercase tracking-wider">Findings</h4>
              {data.result.findings.map((f, i) => (
                <FindingCard key={i} finding={f} />
              ))}
            </div>

            {data.result.reasoning_trace && (
              <ReasoningTrace
                steps={data.result.reasoning_trace.steps}
                totalMs={data.result.reasoning_trace.totalDurationMs}
                paymentIn={data.payment_in}
              />
            )}

            <div className="bg-surface-2 border border-border rounded-lg divide-y divide-border">
              <DetailRow label="Job ID" mono copyText={data.id}>
                <span className="font-mono text-xs text-foreground">{shortenId(data.id)}</span>
              </DetailRow>
              {data.result_hash && (
                <DetailRow label="Result Hash" mono copyText={data.result_hash}>
                  <span className="font-mono text-xs text-foreground">{shortenHash(data.result_hash)}</span>
                </DetailRow>
              )}
              {data.arc_tx_hash && (
                <DetailRow label="Arc Tx" copyText={data.arc_tx_hash}>
                  <a
                    href={`https://explorer.arc-testnet.usdc.com/tx/${data.arc_tx_hash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-accent hover:text-accent-hover font-mono text-xs underline underline-offset-2"
                  >
                    {shortenHash(data.arc_tx_hash)}
                  </a>
                </DetailRow>
              )}
              {data.payment_in != null && (
                <DetailRow label="Paid" value={`${data.payment_in.toFixed(2)} USDC`} />
              )}
            </div>

            {onNewAnalysis && (
              <button
                type="button"
                onClick={onNewAnalysis}
                className="w-full bg-accent hover:bg-accent-hover text-white font-medium rounded-lg px-4 py-2.5 text-sm transition-colors"
              >
                New Analysis
              </button>
            )}
          </div>
        ) : data.status === 'QUEUED' || data.status === 'PROCESSING' || data.status === 'VALIDATING' ? (
          <div className="flex items-center gap-2 text-muted text-sm py-4">
            <span className="w-2 h-2 rounded-full bg-accent animate-[pulse-dot_1.5s_ease-in-out_infinite]" />
            {data.status === 'QUEUED' && 'Job queued, waiting for processing...'}
            {data.status === 'PROCESSING' && 'AI analysis in progress...'}
            {data.status === 'VALIDATING' && 'Validating result...'}
          </div>
        ) : null}
      </div>
    </div>
  )
}

function RiskBadge({ score }: { score: string }) {
  const colors: Record<string, string> = {
    LOW: 'bg-green-900/40 text-green-300 border-green-700/50',
    MEDIUM: 'bg-yellow-900/40 text-yellow-300 border-yellow-700/50',
    HIGH: 'bg-orange-900/40 text-orange-300 border-orange-700/50',
    CRITICAL: 'bg-red-900/40 text-red-300 border-red-700/50',
  }
  return (
    <span className={`text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-md border ${colors[score] ?? ''}`}>
      {score}
    </span>
  )
}

function FindingCard({ finding }: { finding: NonNullable<JobResultData['result']>['findings'][number] }) {
  const borderColors: Record<string, string> = {
    LOW: 'border-l-green-500',
    MEDIUM: 'border-l-yellow-500',
    HIGH: 'border-l-orange-500',
    CRITICAL: 'border-l-red-500',
  }
  const severityColors: Record<string, string> = {
    LOW: 'bg-green-500',
    MEDIUM: 'bg-yellow-500',
    HIGH: 'bg-orange-500',
    CRITICAL: 'bg-red-500',
  }

  return (
    <div className={`bg-surface-2 border border-border border-l-4 ${borderColors[finding.severity] ?? 'border-l-zinc-500'} rounded-lg p-4`}>
      <div className="flex items-start justify-between mb-2">
        <h5 className="text-sm font-medium text-foreground">{finding.title}</h5>
        <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${severityColors[finding.severity] ?? 'bg-zinc-500'} text-white`}>
          {finding.severity}
        </span>
      </div>
      <p className="text-xs text-muted mb-2">{finding.description}</p>
      <p className="text-[11px] text-muted font-mono mb-2.5">Evidence: {finding.evidence}</p>
      <div className="flex items-center gap-2">
        <div className="flex-1 bg-surface rounded-full h-1.5 overflow-hidden">
          <div
            className="bg-accent h-full rounded-full transition-all duration-500"
            style={{ width: `${finding.confidence}%` }}
          />
        </div>
        <span className="text-[10px] font-mono text-muted">{finding.confidence}%</span>
      </div>
    </div>
  )
}

function ReasoningTrace({
  steps,
  totalMs,
  paymentIn,
}: {
  steps: TraceStep[]
  totalMs: number
  paymentIn: number | null
}) {
  const [expanded, setExpanded] = useState(false)

  const icons: Record<number, string> = {
    1: '🔍',
    2: '🧠',
    3: '✓',
    4: '⛓️',
  }

  return (
    <div className="bg-surface-2 border border-border rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-surface transition-colors"
      >
        <div className="flex items-center gap-2">
          <h4 className="text-xs font-medium text-muted uppercase tracking-wider">Reasoning Trace</h4>
          <span className="text-[10px] text-muted font-mono">
            {steps.length} steps · {(totalMs / 1000).toFixed(1)}s
          </span>
        </div>
        <span className={`text-xs text-muted transition-transform ${expanded ? 'rotate-180' : ''}`}>
          ▼
        </span>
      </button>

      {expanded && (
        <div className="border-t border-border divide-y divide-border">
          {steps.map((s) => (
            <div key={s.step} className="px-4 py-3">
              <div className="flex items-start gap-3">
                <span className="text-sm mt-0.5">{icons[s.step] ?? '•'}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-xs font-medium text-foreground">{s.name}</span>
                    <span className="text-[10px] text-muted font-mono">
                      {(s.durationMs / 1000).toFixed(1)}s
                    </span>
                  </div>
                  <p className="text-[11px] text-muted mb-1.5">{s.description}</p>
                  <div className="bg-surface rounded-md px-2.5 py-1.5 space-y-0.5">
                    {Object.entries(s.details).map(([key, val]) => {
                      const displayVal = typeof val === 'object' ? JSON.stringify(val) : String(val)
                      const isExplorer = key === 'arcExplorer' && typeof val === 'string' && val.startsWith('http')
                      return (
                        <div key={key} className="flex items-center gap-2 text-[10px]">
                          <span className="text-muted whitespace-nowrap">{key}:</span>
                          {isExplorer ? (
                            <a
                              href={val as string}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-accent hover:text-accent-hover underline underline-offset-2 truncate"
                            >
                              {val as string}
                            </a>
                          ) : (
                            <span className="text-foreground font-mono truncate">{displayVal}</span>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            </div>
          ))}

          {paymentIn != null && (
            <div className="px-4 py-2.5 bg-accent/5 border-t border-border">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-muted">Total spent</span>
                <span className="text-foreground font-mono font-medium">{paymentIn.toFixed(2)} USDC</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function DetailRow({ label, value, mono, children, copyText }: {
  label: string
  value?: string
  mono?: boolean
  children?: React.ReactNode
  copyText?: string
}) {
  return (
    <div className="flex items-center justify-between px-4 py-2.5">
      <span className="text-xs text-muted">{label}</span>
      <div className="flex items-center gap-1.5 max-w-[60%]">
        {children ?? (
          <span className={`text-xs truncate ${mono ? 'font-mono' : ''} text-foreground`}>{value}</span>
        )}
        {copyText && <CopyButton text={copyText} />}
      </div>
    </div>
  )
}

function shortenId(id: string): string {
  return `${id.slice(0, 8)}...${id.slice(-4)}`
}

function shortenHash(hash: string): string {
  return `${hash.slice(0, 10)}...${hash.slice(-6)}`
}
