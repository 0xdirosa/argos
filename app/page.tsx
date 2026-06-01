'use client'

import { useState } from 'react'
import JobForm from './components/JobForm'
import JobResult from './components/JobResult'
import AgentStats from './components/AgentStats'

export default function Home() {
  const [activeJobId, setActiveJobId] = useState<string | null>(null)

  return (
    <div className="min-h-full flex flex-col">
      <header className="border-b border-border">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-accent flex items-center justify-center">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <circle cx="12" cy="12" r="4" />
                <line x1="12" y1="2" x2="12" y2="6" />
                <line x1="12" y1="18" x2="12" y2="22" />
                <line x1="2" y1="12" x2="6" y2="12" />
                <line x1="18" y1="12" x2="22" y2="12" />
              </svg>
            </div>
            <span className="font-semibold text-base tracking-tight">Argos</span>
          </div>
          <nav className="flex items-center gap-3">
            <span className="text-xs text-muted">Arc Testnet</span>
            <span className="w-1.5 h-1.5 rounded-full bg-success" />
          </nav>
        </div>
      </header>

      <main className="flex-1">
        <section className="max-w-5xl mx-auto px-4 sm:px-6 pt-12 pb-8">
          <div className="text-center sm:text-left">
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
              x402-Native On-Chain Intelligence
            </h1>
            <p className="mt-3 text-muted text-sm sm:text-base max-w-xl leading-relaxed">
              AI-powered analysis for Arc Testnet wallets, tokens, and contracts.
              Pay-per-query via x402 micropayments — no subscription needed.
            </p>
          </div>
        </section>

        <section className="max-w-5xl mx-auto px-4 sm:px-6 pb-8">
          <AgentStats onJobSelect={setActiveJobId} />
        </section>

        <section className="max-w-5xl mx-auto px-4 sm:px-6 pb-8">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            <div className="lg:col-span-2">
              <h2 className="text-sm font-medium text-foreground mb-3">New Analysis</h2>
              <JobForm onJobCreated={setActiveJobId} />
            </div>
            <div className="lg:col-span-3">
              <h2 className="text-sm font-medium text-foreground mb-3">Result</h2>
              {activeJobId ? (
                <JobResult key={activeJobId} jobId={activeJobId} onDone={() => {}} />
              ) : (
                <div className="bg-surface border border-border rounded-xl p-8 flex items-center justify-center">
                  <p className="text-sm text-muted">Submit an analysis to see results here.</p>
                </div>
              )}
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border py-4">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 flex items-center justify-between">
          <p className="text-xs text-muted">Argos — x402 Agent on Arc Testnet</p>
          <p className="text-xs text-muted font-mono">v0.1.0</p>
        </div>
      </footer>
    </div>
  )
}
