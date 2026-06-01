'use client'

import { useEffect, useState } from 'react'
import { StatusBadge } from './AgentStats'

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
  } | null
  result_hash: string | null
  arc_tx_hash: string | null
  payment_in: number | null
  created_at: string
  completed_at: string | null
}

export default function JobResult({ jobId, onDone }: { jobId: string; onDone?: () => void }) {
  const [data, setData] = useState<JobResultData | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
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
          setData(job)

          if (job.status === 'COMPLETED' || job.status === 'FAILED') {
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
  }, [jobId, onDone])

  if (error) {
    return (
      <div className="bg-surface border border-border rounded-xl p-5">
        <p className="text-danger text-sm">{error}</p>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="bg-surface border border-border rounded-xl p-5">
        <div className="flex items-center gap-2 text-muted text-sm">
          <span className="w-2 h-2 rounded-full bg-accent animate-[pulse-dot_1.5s_ease-in-out_infinite]" />
          Loading result...
        </div>
      </div>
    )
  }

  return (
    <div className="bg-surface border border-border rounded-xl overflow-hidden">
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
          <>
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

            <div className="bg-surface-2 border border-border rounded-lg divide-y divide-border">
              <DetailRow label="Job ID" value={data.id} mono />
              {data.result_hash && <DetailRow label="Result Hash" value={data.result_hash} mono />}
              {data.arc_tx_hash && (
                <DetailRow label="Arc Tx">
                  <a
                    href={`https://testnet.arcscan.com/tx/${data.arc_tx_hash}`}
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
          </>
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
  const severityColors: Record<string, string> = {
    LOW: 'bg-green-500',
    MEDIUM: 'bg-yellow-500',
    HIGH: 'bg-orange-500',
    CRITICAL: 'bg-red-500',
  }

  return (
    <div className="bg-surface-2 border border-border rounded-lg p-4">
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

function DetailRow({ label, value, mono, children }: {
  label: string
  value?: string
  mono?: boolean
  children?: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-between px-4 py-2.5">
      <span className="text-xs text-muted">{label}</span>
      {children ?? (
        <span className={`text-xs ${mono ? 'font-mono' : ''} text-foreground`}>{value}</span>
      )}
    </div>
  )
}

function shortenHash(hash: string): string {
  return `${hash.slice(0, 10)}...${hash.slice(-6)}`
}
