'use client'

import { useState, FormEvent, useEffect, useRef } from 'react'

type QueryType = 'wallet' | 'token' | 'contract'

type FlowStep = 'idle' | 'initiating' | 'awaiting-auth' | 'verifying' | 'queued' | 'processing' | 'settling' | 'complete' | 'error'

const FLOW_LABELS: Record<FlowStep, string> = {
  idle: '',
  initiating: 'Initiating x402 payment...',
  'awaiting-auth': 'Waiting for authorization...',
  verifying: 'Verifying payment...',
  queued: 'Agent queued',
  processing: 'Agent processing...',
  settling: 'Settling on-chain...',
  complete: 'Complete',
  error: '',
}

const FLOW_ORDER: FlowStep[] = ['initiating', 'awaiting-auth', 'verifying', 'queued', 'processing', 'settling', 'complete']

export default function JobForm({ onJobCreated }: { onJobCreated?: (id: string) => void }) {
  const [target, setTarget] = useState('')
  const [queryType, setQueryType] = useState<QueryType>('wallet')
  const [step, setStep] = useState<FlowStep>('idle')
  const [jobId, setJobId] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [])

  function startPolling(id: string) {
    const flowMap: Record<string, FlowStep> = {
      QUEUED: 'queued',
      PROCESSING: 'processing',
      VALIDATING: 'processing',
      COMPLETED: 'complete',
      FAILED: 'complete',
    }

    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/jobs/${id}`)
        if (!res.ok) return
        const job = await res.json()
        const nextStep = flowMap[job.status] ?? step
        setStep(nextStep)
        if (job.status === 'COMPLETED' || job.status === 'FAILED') {
          if (pollRef.current) clearInterval(pollRef.current)
        }
      } catch {
        // retry
      }
    }, 2000)
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setErrorMsg(null)
    setJobId(null)

    if (!/^0x[a-fA-F0-9]{40}$/.test(target)) {
      setErrorMsg('Invalid address format (0x...)')
      return
    }

    try {
      setStep('initiating')
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target, queryType }),
      })

      if (res.status === 402) {
        setStep('awaiting-auth')
        const paymentRequired = res.headers.get('PAYMENT-REQUIRED')
        if (!paymentRequired) {
          setErrorMsg('Payment required but no PAYMENT-REQUIRED header received')
          setStep('error')
          return
        }

        if (typeof window === 'undefined' || !(window as unknown as Record<string, unknown>)['ethereum']) {
          setErrorMsg('Payment required. Install a wallet like MetaMask to pay via x402.')
          setStep('error')
          return
        }

        const payload = await createX402Payment(paymentRequired)
        if (!payload) {
          setErrorMsg('Payment authorization failed or was rejected')
          setStep('error')
          return
        }

        setStep('verifying')
        const retryRes = await fetch('/api/analyze', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'payment-signature': btoa(JSON.stringify(payload)),
          },
          body: JSON.stringify({ target, queryType }),
        })

        if (!retryRes.ok) {
          const err = await retryRes.json().catch(() => ({ error: 'Payment verification failed' }))
          setErrorMsg(err.error ?? 'Payment verification failed')
          setStep('error')
          return
        }

        const retryData = await retryRes.json()
        setJobId(retryData.jobId)
        setStep('queued')
        onJobCreated?.(retryData.jobId)
        startPolling(retryData.jobId)
        return
      }

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Request failed' }))
        setErrorMsg(err.error ?? 'Request failed')
        setStep('error')
        return
      }

      const data = await res.json()
      setJobId(data.jobId)
      setStep('queued')
      onJobCreated?.(data.jobId)
      startPolling(data.jobId)
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Network error')
      setStep('error')
    }
  }

  const currentIdx = FLOW_ORDER.indexOf(step)

  return (
    <div className="bg-surface border border-border rounded-xl p-5">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="target" className="block text-sm font-medium text-foreground mb-1.5">
            Target Address
          </label>
          <input
            id="target"
            type="text"
            placeholder="0x..."
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            className="w-full bg-surface-2 border border-border rounded-lg px-3 py-2.5 text-sm font-mono text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent transition-colors"
            disabled={step !== 'idle' && step !== 'error'}
          />
        </div>

        <div>
          <label htmlFor="queryType" className="block text-sm font-medium text-foreground mb-1.5">
            Analysis Type
          </label>
          <select
            id="queryType"
            value={queryType}
            onChange={(e) => setQueryType(e.target.value as QueryType)}
            className="w-full bg-surface-2 border border-border rounded-lg px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent transition-colors"
            disabled={step !== 'idle' && step !== 'error'}
          >
            <option value="wallet">Wallet</option>
            <option value="token">Token</option>
            <option value="contract">Contract</option>
          </select>
        </div>

        <button
          type="submit"
          disabled={currentIdx >= 0}
          className="w-full bg-accent hover:bg-accent-hover disabled:bg-accent/40 text-white font-medium rounded-lg px-4 py-2.5 text-sm transition-colors disabled:cursor-not-allowed"
        >
          {currentIdx >= 0 ? 'Processing...' : 'Analyze — 0.50 USDC'}
        </button>
      </form>

      {currentIdx >= 0 && (
        <div className="mt-5 space-y-2">
          {FLOW_ORDER.map((label, i) => (
            <div key={i} className={`flex items-center gap-2.5 text-sm ${
              i === currentIdx ? 'text-foreground' : i < currentIdx ? 'text-success' : 'text-muted'
            }`}>
              <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                i < currentIdx ? 'bg-success/20 text-success' : i === currentIdx ? 'bg-accent/20 text-accent' : 'bg-surface-2 text-muted'
              }`}>
                {i < currentIdx ? '✓' : i === currentIdx ? '●' : '○'}
              </div>
              <span className={i === currentIdx ? 'font-medium' : ''}>{FLOW_LABELS[label]}</span>
              {i === currentIdx && label === 'processing' && (
                <span className="w-1.5 h-1.5 rounded-full bg-accent animate-[pulse-dot_1.5s_ease-in-out_infinite]" />
              )}
            </div>
          ))}
        </div>
      )}

      {jobId && !['queued', 'processing', 'settling', 'complete'].includes(step) && (
        <div className="mt-4 bg-accent/10 border border-accent/20 rounded-lg px-3 py-2.5">
          <p className="text-xs text-muted mb-0.5">Job ID</p>
          <p className="text-sm font-mono text-accent break-all">{jobId}</p>
        </div>
      )}

      {errorMsg && (
        <div className="mt-4 bg-danger/10 border border-danger/20 rounded-lg px-3 py-2.5">
          <p className="text-sm text-danger">{errorMsg}</p>
        </div>
      )}
    </div>
  )
}

async function createX402Payment(paymentRequiredB64: string): Promise<unknown | null> {
  try {
    const paymentRequired = JSON.parse(atob(paymentRequiredB64))
    const accepts = paymentRequired.accepts ?? []
    const requirement = accepts.find((a: { scheme: string }) => a.scheme === 'exact')
    if (!requirement) return null

    const eth = (window as unknown as Record<string, { request: (args: Record<string, unknown>) => Promise<unknown> }>).ethereum
    if (!eth) return null

    const accounts = await eth.request({ method: 'eth_requestAccounts' }) as string[]
    if (!accounts?.[0]) return null

    const validBefore = Math.floor(Date.now() / 1000) + 3600
    const nonce = await eth.request({
      method: 'eth_getTransactionCount',
      params: [accounts[0], 'latest'],
    }) as string

    const message = {
      from: accounts[0],
      to: requirement.payTo,
      value: requirement.amount,
      validAfter: '0',
      validBefore: `0x${validBefore.toString(16)}`,
      nonce,
    }

    const domain = {
      name: requirement.extra?.name ?? 'GatewayWalletBatched',
      version: requirement.extra?.version ?? '1',
      chainId: 5042002,
      verifyingContract: requirement.extra?.verifyingContract ?? '0x0077777d7EBA4688BDeF3E311b846F25870A19B9',
    }

    const signature = await eth.request({
      method: 'eth_signTypedData_v4',
      params: [
        accounts[0],
        JSON.stringify({
          domain,
          types: {
            EIP712Domain: [
              { name: 'name', type: 'string' },
              { name: 'version', type: 'string' },
              { name: 'chainId', type: 'uint256' },
              { name: 'verifyingContract', type: 'address' },
            ],
            TransferWithAuthorization: [
              { name: 'from', type: 'address' },
              { name: 'to', type: 'address' },
              { name: 'value', type: 'uint256' },
              { name: 'validAfter', type: 'uint256' },
              { name: 'validBefore', type: 'uint256' },
              { name: 'nonce', type: 'bytes32' },
            ],
          },
          primaryType: 'TransferWithAuthorization',
          message,
        }),
      ],
    }) as string

    return {
      x402Version: paymentRequired.x402Version ?? 2,
      payload: { signature, authorization: message },
    }
  } catch (err) {
    console.error('[x402] Payment creation failed:', err)
    return null
  }
}
