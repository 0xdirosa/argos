'use client'

import { useState, useEffect } from 'react'
import JobForm from './components/JobForm'
import JobResult from './components/JobResult'
import AgentStats from './components/AgentStats'
import Reveal from './components/Reveal'
import CountUp from './components/CountUp'
import TypeWriter from './components/TypeWriter'

export default function Home() {
  const [activeJobId, setActiveJobId] = useState<string | null>(null)
  const [demoMode, setDemoMode] = useState(false)
  const [heroStats, setHeroStats] = useState<{ job_count: number; total_earned: number } | null>(null)

  useEffect(() => {
    fetch('/api/agent/stats').then(r => r.ok && r.json()).then(d => {
      if (d) setHeroStats(d)
    }).catch(() => {})
  }, [])

  function handleDemo() {
    setDemoMode(true)
    setActiveJobId('__demo__')
  }

  function handleNewAnalysis() {
    setActiveJobId(null)
    setDemoMode(false)
  }

  function handleJobCreated(id: string) {
    setActiveJobId(id)
    setDemoMode(false)
  }

  return (
    <div className="min-h-full flex flex-col">
      {/* ── Animated Background ── */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(99,102,241,0.08),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_rgba(34,197,94,0.05),transparent_50%)]" />
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-accent/5 rounded-full blur-3xl animate-[pulse-dot_8s_ease-in-out_infinite]" />
        <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-purple-500/5 rounded-full blur-3xl animate-[pulse-dot_10s_ease-in-out_infinite_2s]" />
      </div>

      {/* ── Header ── */}
      <header className="border-b border-border/50 bg-background/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent to-purple-500 flex items-center justify-center shadow-lg shadow-accent/20">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="4" />
                <line x1="12" y1="2" x2="12" y2="6" /><line x1="12" y1="18" x2="12" y2="22" />
                <line x1="2" y1="12" x2="6" y2="12" /><line x1="18" y1="12" x2="22" y2="12" />
              </svg>
            </div>
            <div>
              <span className="font-bold text-base tracking-tight text-foreground">Argos</span>
              <span className="text-[10px] text-muted ml-2 font-mono">x402 Agent</span>
              </div>
              <div className="mt-6 text-center">
                <a href="/about" className="text-xs text-accent hover:text-accent-hover transition-colors">
                  Learn more about Argos →
                </a>
              </div>
            </div>
          <nav className="flex items-center gap-3">
            <a href="/about" className="text-xs text-muted hover:text-foreground transition-colors hidden sm:inline">About</a>
            <a href="/proof" className="text-xs text-muted hover:text-foreground transition-colors hidden sm:inline">On-Chain Proof</a>
            <span className="text-xs text-muted hidden sm:inline">Arc Testnet</span>
            <span className="w-1.5 h-1.5 rounded-full bg-success animate-[pulse-dot_2s_ease-in-out_infinite]" />
          </nav>
        </div>
      </header>

      <main className="flex-1">
        {/* ── Hero Section ── */}
        <section className="relative overflow-hidden">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-16 pb-12 text-center">
            <Reveal delay={0}>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-accent/10 border border-accent/20 text-[11px] text-accent font-medium mb-6">
                <span className="w-1.5 h-1.5 rounded-full bg-accent animate-[pulse-dot_1.5s_ease-in-out_infinite]" />
                Arc Testnet · x402 Payments
              </div>
            </Reveal>

            <Reveal delay={150}>
              <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-foreground leading-tight">
                On-Chain Intelligence,
                <br />
                <span className="bg-gradient-to-r from-accent to-purple-400 bg-clip-text text-transparent">
                  <TypeWriter text="Pay Per Query" speed={60} />
                </span>
              </h1>
            </Reveal>

            <Reveal delay={300}>
              <p className="mt-4 text-muted text-sm sm:text-base max-w-lg mx-auto leading-relaxed">
                AI-powered analysis for Arc Testnet wallets, tokens, and contracts.
                Powered by <strong className="text-foreground">Circle Agent Stack</strong> — pay-per-query via x402 micropayments
                with <strong className="text-foreground">Circle Gateway</strong>. No subscription needed.
              </p>
            </Reveal>

            {/* Social Proof */}
            {heroStats && (
              <Reveal delay={450}>
                <div className="mt-6 flex items-center justify-center gap-6 text-xs text-muted">
                  <div className="flex items-center gap-1.5">
                    <span className="text-accent font-semibold min-w-[2ch] text-right tabular-nums">
                      <CountUp end={heroStats.job_count} />
                    </span>
                    <span>analyses completed</span>
                  </div>
                  <div className="w-px h-4 bg-border" />
                  <div className="flex items-center gap-1.5">
                    <span className="text-accent font-semibold tabular-nums">
                      <CountUp end={heroStats.total_earned} duration={2000} decimals={2} />
                    </span>
                    <span>USDC earned</span>
                  </div>
                  <div className="w-px h-4 bg-border hidden sm:block" />
                  <div className="items-center gap-1.5 hidden sm:flex">
                    <span className="w-1.5 h-1.5 rounded-full bg-success" />
                    <span>Results on-chain</span>
                  </div>
                </div>
              </Reveal>
            )}

            {/* Demo CTA */}
            <Reveal delay={600}>
              <div className="mt-8 flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={handleDemo}
                  className="bg-gradient-to-r from-accent to-purple-500 hover:from-accent-hover hover:to-purple-400 text-white font-medium rounded-lg px-6 py-2.5 text-sm transition-all duration-300 shadow-lg shadow-accent/20 hover:shadow-accent/30 hover:scale-105 active:scale-95"
                >
                  Try Demo 🚀
                </button>
                <button
                  type="button"
                  onClick={() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })}
                  className="border border-border hover:bg-surface text-muted hover:text-foreground font-medium rounded-lg px-5 py-2.5 text-sm transition-all duration-300 hover:scale-105 active:scale-95"
                >
                  How It Works
                </button>
              </div>
            </Reveal>
          </div>
        </section>

        {/* ── How It Works ── */}
        <Reveal delay={150}>
          <section id="how-it-works" className="max-w-5xl mx-auto px-4 sm:px-6 pb-12">
            <div className="glass-card rounded-2xl p-6 sm:p-8 animate-glow-pulse transition-all duration-500">
              <h2 className="text-sm font-medium text-foreground mb-6 text-center">How It Works</h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6">
                {steps.map((s, i) => (
                  <div key={i} className="text-center group">
                    <div className="w-10 h-10 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center mx-auto mb-3 transition-all duration-500 group-hover:scale-110 group-hover:bg-accent/20 group-hover:border-accent/40 group-hover:shadow-lg group-hover:shadow-accent/10">
                      <span className="text-lg group-hover:animate-float inline-block">{s.icon}</span>
                    </div>
                    <p className="text-xs font-medium text-foreground mb-1">{s.title}</p>
                    <p className="text-[11px] text-muted leading-relaxed">{s.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </Reveal>

        {/* ── Stats ── */}
        <Reveal delay={300}>
          <section className="max-w-5xl mx-auto px-4 sm:px-6 pb-8">
            <AgentStats onJobSelect={(id) => { setActiveJobId(id); setDemoMode(false) }} />
          </section>
        </Reveal>

        {/* ── Form + Result ── */}
        <Reveal delay={450}>
          <section className="max-w-5xl mx-auto px-4 sm:px-6 pb-8">
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
              <div className="lg:col-span-2">
                <h2 className="text-sm font-medium text-foreground mb-3">New Analysis</h2>
                <JobForm onJobCreated={handleJobCreated} />
              </div>
              <div className="lg:col-span-3">
                <h2 className="text-sm font-medium text-foreground mb-3">Result</h2>
                {activeJobId === '__demo__' ? (
                  <JobResult key="demo" jobId="__demo__" onDone={() => {}} onNewAnalysis={handleNewAnalysis} isDemo />
                ) : activeJobId ? (
                  <JobResult key={activeJobId} jobId={activeJobId} onDone={() => {}} onNewAnalysis={handleNewAnalysis} />
                ) : (
                  <div className="glass-card rounded-xl p-8 flex flex-col items-center justify-center text-center gap-3 transition-all duration-500 hover:border-accent/20">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-muted">
                      <circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="4" />
                      <line x1="12" y1="2" x2="12" y2="6" /><line x1="12" y1="18" x2="12" y2="22" />
                      <line x1="2" y1="12" x2="6" y2="12" /><line x1="18" y1="12" x2="22" y2="12" />
                    </svg>
                    <p className="text-sm text-muted">Submit an analysis or try the demo to see results here.</p>
                  </div>
                )}
              </div>
            </div>
          </section>
        </Reveal>
      </main>

      <footer className="border-t border-border/50 py-4">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 flex flex-col items-center gap-2 sm:flex-row sm:justify-between">
          <p className="text-xs text-muted">Argos — x402 Agent on Arc Testnet</p>
          <div className="flex items-center gap-3">
            <a href="/about" className="text-xs text-muted hover:text-foreground transition-colors">About</a>
            <a href="/proof" className="text-xs text-muted hover:text-foreground transition-colors">On-Chain Proof</a>
          </div>
        </div>
        <div className="max-w-5xl mx-auto px-4 sm:px-6 mt-2 pt-2 border-t border-border/30 flex items-center justify-center gap-1.5 text-[11px] text-muted">
          <span>Built on</span>
          <a href="https://developers.circle.com/agent-stack" target="_blank" rel="noopener noreferrer" className="text-accent hover:text-accent-hover underline underline-offset-2">Circle Agent Stack</a>
          <span>·</span>
          <a href="https://docs.arc.io" target="_blank" rel="noopener noreferrer" className="text-accent hover:text-accent-hover underline underline-offset-2">Arc Testnet</a>
          <span>·</span>
          <a href="https://testnet.arcscan.app/address/0xe19b55f5f8da0af5ecdbf351ba3e672698242bac" target="_blank" rel="noopener noreferrer" className="text-accent hover:text-accent-hover underline underline-offset-2">ERC-8004</a>
        </div>
      </footer>
    </div>
  )
}

const steps = [
  { icon: '🔗', title: 'Connect Wallet', desc: 'MetaMask or any EIP-1193 wallet' },
  { icon: '💸', title: 'Pay 0.50 USDC', desc: 'Gasless via Circle Gateway & Agent Stack' },
  { icon: '🧠', title: 'AI Analysis', desc: 'Groq llama-3.1-8b-instant' },
  { icon: '⛓️', title: 'On-Chain Proof', desc: 'Result hash stored on Arc' },
]
