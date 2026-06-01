import Link from 'next/link'

export default function AboutPage() {
  return (
    <div className="min-h-full flex flex-col">
      <header className="border-b border-border">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
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
            <Link href="/" className="text-muted hover:text-foreground transition-colors">Dashboard</Link>
            <Link href="/proof" className="text-muted hover:text-foreground transition-colors">On-Chain Proof</Link>
          </nav>
        </div>
      </header>

      <main className="flex-1 max-w-4xl mx-auto px-4 sm:px-6 py-12 space-y-12">
        <section>
          <h1 className="text-3xl font-bold tracking-tight mb-3">What is Argos?</h1>
          <p className="text-muted text-base leading-relaxed max-w-2xl">
            Argos is an AI-powered on-chain intelligence agent built on <strong className="text-foreground">Arc Testnet</strong>.
            It analyzes wallets, tokens, and smart contracts using <strong className="text-foreground">Groq AI</strong> (llama-3.1-8b-instant)
            and settles results on-chain via <strong className="text-foreground">Circle Developer-Controlled Wallets</strong>.
          </p>
          <p className="text-muted text-base leading-relaxed max-w-2xl mt-3">
            Every query is a pay-per-use microtransaction powered by <strong className="text-foreground">x402</strong> —
            the HTTP 402 Payment Required protocol that integrates Circle <strong className="text-foreground">Gateway</strong>
            for gasless USDC payments on Arc Testnet.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-5">How x402 Works — Step by Step</h2>
          <div className="space-y-4">
            {steps.map((s, i) => (
              <div key={i} className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-accent/20 text-accent flex items-center justify-center text-sm font-bold">
                  {i + 1}
                </div>
                <div className="pt-1.5">
                  <h3 className="text-sm font-medium text-foreground">{s.title}</h3>
                  <p className="text-sm text-muted mt-0.5 leading-relaxed">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="bg-surface border border-border rounded-xl p-6">
          <h2 className="text-lg font-semibold mb-3">Why Arc Testnet?</h2>
          <ul className="space-y-2 text-sm text-muted">
            {reasons.map((r, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="text-accent mt-0.5">•</span>
                <span>{r}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="flex flex-wrap gap-4">
          <a href="https://explorer.arc-testnet.usdc.com/address/0xe19b55f5f8da0af5ecdbf351ba3e672698242bac" target="_blank" rel="noopener noreferrer"
             className="inline-flex items-center gap-2 bg-surface border border-border rounded-lg px-4 py-2.5 text-sm text-foreground hover:bg-surface-2 transition-colors">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
            Agent Contract on Arc Explorer
          </a>
          <a href="https://github.com/0xdirosa/argos" target="_blank" rel="noopener noreferrer"
             className="inline-flex items-center gap-2 bg-surface border border-border rounded-lg px-4 py-2.5 text-sm text-foreground hover:bg-surface-2 transition-colors">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/></svg>
            GitHub Repo
          </a>
        </section>
      </main>

      <footer className="border-t border-border py-4 mt-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 flex items-center justify-between">
          <p className="text-xs text-muted">Argos — x402 Agent on Arc Testnet</p>
          <p className="text-xs text-muted font-mono">v0.1.0</p>
        </div>
      </footer>
    </div>
  )
}

const steps = [
  {
    title: 'User submits a query',
    desc: 'The frontend POSTs the target address and analysis type (wallet/token/contract) to /api/analyze. No payment is sent yet.',
  },
  {
    title: 'Server responds with 402 Payment Required',
    desc: 'The server returns HTTP 402 with a PAYMENT-REQUIRED header containing a Gateway batching option: 0.50 USDC to the agent owner wallet via Circle Gateway on Arc Testnet.',
  },
  {
    title: 'Client signs EIP-3009 authorization',
    desc: 'The browser wallet (e.g., MetaMask) prompts the user to sign a TransferWithAuthorization. This authorizes Circle Gateway to pull 0.50 USDC from the user\'s Gateway balance — no gas needed.',
  },
  {
    title: 'Server verifies and settles payment',
    desc: 'The server receives the signed authorization, verifies it via Circle\'s BatchFacilitatorClient, and settles the batch transfer. The payment is complete in seconds.',
  },
  {
    title: 'Job created on-chain',
    desc: 'The job is inserted into Supabase (status: QUEUED) and mirrored on Arc Testnet via createJob() on the ArgosJobManager contract using the Circle Developer-Controlled Wallets SDK.',
  },
  {
    title: 'AI analysis runs',
    desc: 'A background worker picks up the job: it collects on-chain data via viem (balance, bytecode, tx count), then sends the data to Groq AI (llama-3.1-8b-instant) for multi-hop chain-of-thought reasoning.',
  },
  {
    title: 'Result validated and stored on-chain',
    desc: 'The AI output is validated (confidence ≥ 60, findings non-empty), then the keccak256 hash of the result JSON is settled on-chain via settleJob() by the Validator Wallet. The full result is stored in Supabase for retrieval.',
  },
  {
    title: 'User polls for result',
    desc: 'The frontend polls GET /api/jobs/[id] until status becomes COMPLETED, then renders the findings, risk score, and on-chain transaction link.',
  },
]

const reasons = [
  'Gas in USDC — no need to acquire native ETH for transaction fees. Every wallet already holds USDC.',
  'Circle Gateway native support — gasless payments via Gateway with instant settlement.',
  'Developer-Controlled Wallets SDK — programmatic transaction signing without managing raw keys.',
  'ERC-8004 alignment — two-wallet pattern (owner + validator) maps directly to the agent lifecycle standard.',
  'Testnet with real USDC flow — simulate production agent economics without financial risk.',
]
