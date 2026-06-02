'use client'

import { useEffect, useState } from 'react'

type CompletedJob = {
  id: string
  query_type: string
  target: string
  arc_tx_hash: string | null
  result_hash: string | null
  payment_in: number | null
  created_at: string
  completed_at: string | null
}

import Link from 'next/link'

export default function ProofPage() {
  const [jobs, setJobs] = useState<CompletedJob[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/jobs?status=COMPLETED')
      .then((r) => r.json())
      .then((data) => {
        setJobs(Array.isArray(data) ? data : (data.jobs ?? []))
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  return (
    <div className="min-h-full flex flex-col">
      <header className="border-b border-border">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <div className="w-7 h-7 rounded-lg bg-accent flex items-center justify-center">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="4" />
                <line x1="12" y1="2" x2="12" y2="6" /><line x1="12" y1="18" x2="12" y2="22" />
                <line x1="2" y1="12" x2="6" y2="12" /><line x1="18" y1="12" x2="22" y2="12" />
              </svg>
            </div>
            <span className="font-semibold text-base tracking-tight">Argos</span>
          </Link>
          <nav className="flex items-center gap-4 text-sm">
            <Link href="/about" className="text-muted hover:text-foreground transition-colors">About</Link>
            <span className="text-foreground font-medium">On-Chain Proof</span>
            <Link href="/" className="text-muted hover:text-foreground transition-colors">Dashboard</Link>
          </nav>
        </div>
      </header>

      <main className="flex-1 max-w-5xl mx-auto px-4 sm:px-6 py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight mb-2">On-Chain Proof</h1>
          <p className="text-muted text-sm">
            Every completed analysis is settled on Arc Testnet via the ArgosJobManager contract.
            Each row links to the corresponding transaction on Arc Explorer.
          </p>
        </div>

        {loading ? (
          <div className="flex items-center gap-2 text-muted text-sm py-8">
            <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
            Loading...
          </div>
        ) : jobs.length === 0 ? (
          <div className="bg-surface border border-border rounded-xl p-8 text-center">
            <p className="text-muted text-sm">No completed jobs yet. Submit an analysis from the Dashboard.</p>
          </div>
        ) : (
          <div className="bg-surface border border-border rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-muted text-xs uppercase tracking-wider">
                  <th className="text-left px-4 py-3 font-medium">Type</th>
                  <th className="text-left px-4 py-3 font-medium">Target</th>
                  <th className="text-left px-4 py-3 font-medium hidden sm:table-cell">Completed</th>
                  <th className="text-left px-4 py-3 font-medium hidden md:table-cell">Payment</th>
                  <th className="text-left px-4 py-3 font-medium">Arc Tx</th>
                </tr>
              </thead>
              <tbody>
                {jobs.map((job) => (
                  <tr key={job.id} className="border-b border-border/50 hover:bg-surface-2 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs uppercase text-muted">{job.query_type}</td>
                    <td className="px-4 py-3 font-mono text-xs">{shorten(job.target)}</td>
                    <td className="px-4 py-3 text-muted text-xs hidden sm:table-cell">
                      {job.completed_at ? new Date(job.completed_at).toLocaleDateString() : '-'}
                    </td>
                    <td className="px-4 py-3 text-muted text-xs font-mono hidden md:table-cell">
                      {job.payment_in != null ? `${job.payment_in.toFixed(2)} USDC` : '-'}
                    </td>
                    <td className="px-4 py-3">
                      {job.arc_tx_hash ? (
                        <a
                          href={`https://testnet.arcscan.app/tx/${job.arc_tx_hash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-accent hover:text-accent-hover font-mono text-xs underline underline-offset-2"
                        >
                          {shorten(job.arc_tx_hash)}
                        </a>
                      ) : (
                        <span className="text-muted text-xs">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="mt-8 bg-surface border border-border rounded-xl p-5 text-sm">
          <h2 className="font-medium mb-2">Contract</h2>
          <p className="text-muted mb-1">
            ArgosJobManager deployed at{' '}
            <a
              href="https://testnet.arcscan.app/address/0xe19b55f5f8da0af5ecdbf351ba3e672698242bac"
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent hover:text-accent-hover underline underline-offset-2 font-mono"
            >
              0xe19b55...42bac
            </a>
          </p>
          <p className="text-muted text-xs">
            Owner: <span className="font-mono">0x6fa042...069e3</span> &middot;
            Validator: <span className="font-mono">0xfef84f...8886e</span>
          </p>
        </div>

        <div className="text-center mt-8">
          <Link
            href="/"
            className="inline-flex items-center gap-2 bg-gradient-to-r from-accent to-purple-500 hover:from-accent-hover hover:to-purple-400 text-white font-medium rounded-lg px-6 py-3 text-sm transition-all duration-300 hover:scale-105 shadow-lg shadow-accent/20"
          >
            Try Live Demo →
          </Link>
        </div>
      </main>

      <footer className="border-t border-border py-4 mt-12">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 flex items-center justify-between">
          <p className="text-xs text-muted">Argos — x402 Agent on Arc Testnet</p>
          <p className="text-xs text-muted font-mono">v0.1.0</p>
        </div>
      </footer>
    </div>
  )
}

function shorten(s: string): string {
  return s.length > 14 ? `${s.slice(0, 8)}...${s.slice(-4)}` : s
}
