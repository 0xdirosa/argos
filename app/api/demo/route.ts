import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

const DEMO_TARGET = '0x000000000000000000000000000000000000dead'

const DEMO_FALLBACK = {
  id: 'demo',
  status: 'COMPLETED',
  error_msg: null,
  result: {
    summary: 'The wallet 0x000...dEaD is the canonical zero-address on Arc Testnet. It has an extremely high balance (3.6 quadrillion USDC) and zero transaction history, indicating it is a burn/blackhole address. No contract code is deployed. This address exhibits no suspicious on-chain activity beyond its massive dormant balance.',
    findings: [
      {
        title: 'Zero Transaction History',
        description: 'The wallet has never initiated a transaction. This is consistent with a burn address or a newly created wallet that only received funds.',
        evidence: 'txCount: 0',
        confidence: 100,
        severity: 'LOW',
      },
      {
        title: 'Extremely High Balance',
        description: 'The wallet holds approximately 3.6 quadrillion USDC, an astronomically large amount that far exceeds any real user balance.',
        evidence: 'balance: 3623915299142995.50',
        confidence: 95,
        severity: 'MEDIUM',
      },
      {
        title: 'Not a Contract',
        description: 'No bytecode is deployed at this address. It is an externally owned account (EOA) or simply an unused address.',
        evidence: 'isContract: false',
        confidence: 100,
        severity: 'LOW',
      },
    ],
    riskScore: 'MEDIUM',
    confidence: 97,
    reasoning_trace: {
      steps: [
        { step: 1, name: 'Data Collection', description: 'Fetching on-chain data from Arc Testnet RPC', durationMs: 823, details: { target: DEMO_TARGET, queryType: 'wallet', balance: '3623915299142995.50', txCount: 0, isContract: false } },
        { step: 2, name: 'AI Reasoning', description: 'Analyzing via Groq llama-3.1-8b-instant', durationMs: 1142, details: { model: 'llama-3.1-8b-instant', findingsCount: 3, confidence: 97, riskScore: 'MEDIUM' } },
        { step: 3, name: 'Validation', description: 'All quality checks passed', durationMs: 53, details: { valid: true, checks: ['confidence >= 60: PASS', 'findings non-empty: PASS', 'riskScore valid: PASS', 'summary >= 10 chars: PASS'] } },
        { step: 4, name: 'On-Chain Settlement', description: 'Skipped (demo mode)', durationMs: 0, details: { contractAddress: '', txHash: '', arcExplorer: '', paymentIn: 0 } },
      ],
      totalDurationMs: 2018,
    },
  },
  result_hash: null,
  arc_tx_hash: '0xb5b7ff4a9f09b059b72b2db747a8570ef03890b816e14f0078de25beb8d45dd3',
  payment_in: 0,
  created_at: new Date().toISOString(),
  completed_at: new Date().toISOString(),
}

export async function GET() {
  try {
    const supabase = createAdminClient()

    const { data, error } = await supabase
      .from('jobs')
      .select('*')
      .eq('target', DEMO_TARGET)
      .eq('status', 'COMPLETED')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (error || !data) {
      return NextResponse.json(DEMO_FALLBACK)
    }

    return NextResponse.json({
      id: data.id,
      status: data.status,
      error_msg: data.error_msg,
      result: DEMO_FALLBACK.result,
      result_hash: data.result_hash ?? DEMO_FALLBACK.result_hash,
      arc_tx_hash: data.arc_tx_hash ?? DEMO_FALLBACK.arc_tx_hash,
      payment_in: data.payment_in ?? DEMO_FALLBACK.payment_in,
      created_at: data.created_at,
      completed_at: data.completed_at,
    })
  } catch {
    return NextResponse.json(DEMO_FALLBACK)
  }
}
