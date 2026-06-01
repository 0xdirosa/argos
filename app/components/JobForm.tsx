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
  const [walletConnected, setWalletConnected] = useState(false)
  const [walletAddr, setWalletAddr] = useState<string | null>(null)
  const [hasEthereum, setHasEthereum] = useState<boolean | null>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    const eth = typeof window !== 'undefined' && (window as unknown as Record<string, unknown>)['ethereum'] as { request: (args: Record<string, unknown>) => Promise<unknown> } | undefined
    setHasEthereum(!!eth)
    if (eth) {
      eth.request({ method: 'eth_accounts' }).then((accounts) => {
        if (Array.isArray(accounts) && accounts.length > 0) {
          setWalletConnected(true)
          setWalletAddr(accounts[0] as string)
        }
      }).catch(() => {})
    }
  }, [])

  async function connectWallet() {
    try {
      const eth = (window as unknown as Record<string, { request: (args: Record<string, unknown>) => Promise<unknown> }>).ethereum
      if (!eth) return
      const accounts = await eth.request({ method: 'eth_requestAccounts' }) as string[]
      if (accounts?.length > 0) {
        setWalletConnected(true)
        setWalletAddr(accounts[0])
      }
    } catch {
      setErrorMsg('Wallet connection rejected')
    }
  }

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

  if (hasEthereum === false) {
    return (
      <div className="bg-surface border border-border rounded-xl p-5">
        <div className="flex flex-col items-center gap-3 py-6">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-muted">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
          <p className="text-sm text-muted text-center">No wallet detected.</p>
          <p className="text-xs text-muted text-center">Install MetaMask or another wallet to use x402 payments.</p>
        </div>
      </div>
    )
  }

  if (!walletConnected) {
    return (
      <div className="bg-surface border border-border rounded-xl p-5">
        <div className="flex flex-col items-center gap-4 py-6">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-muted">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
          <p className="text-sm text-muted text-center">Connect your wallet to pay via x402.</p>
          <button
            type="button"
            onClick={connectWallet}
            className="bg-accent hover:bg-accent-hover text-white font-medium rounded-lg px-5 py-2.5 text-sm transition-colors"
          >
            Connect Wallet
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-surface border border-border rounded-xl p-5">
      {walletAddr && (
        <div className="mb-4 flex items-center gap-2 px-3 py-2 bg-accent/5 border border-accent/20 rounded-lg">
          <span className="w-1.5 h-1.5 rounded-full bg-success shrink-0" />
          <span className="text-[11px] text-muted font-mono truncate">{shortenAddress(walletAddr)}</span>
        </div>
      )}
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

function shortenAddress(addr: string): string {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`
}
