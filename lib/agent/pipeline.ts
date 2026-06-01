import { createAdminClient } from '@/lib/supabase/admin'
import { collectData } from './collector'
import { reasonAboutData } from './reasoner'
import { validateResult } from './validator'
import { storeResultHash } from './storer'
import { failJobOnChain } from '@/lib/arc/contract'

type JobRow = {
  id: string
  query: string
  query_type: 'wallet' | 'token' | 'contract'
  target: string
  status: string
  result?: unknown
  arc_tx_hash?: string
  error_msg?: string
  payment_in?: number
}

type TraceStep = {
  step: number
  name: string
  description: string
  durationMs: number
  details: Record<string, unknown>
}

export async function runAnalysis(jobId: string): Promise<void> {
  const supabase = createAdminClient()
  let job: JobRow | undefined
  const traceSteps: TraceStep[] = []
  const pipelineStart = Date.now()

  try {
    const { data, error } = await supabase
      .from('jobs')
      .select('*')
      .eq('id', jobId)
      .single()

    if (error || !data) {
      console.error(`[${jobId}] Job not found in database`)
      return
    }
    job = data as JobRow
    if (job.status !== 'QUEUED' && job.status !== 'PROCESSING') {
      throw new Error(`Job ${jobId} is ${job.status}, expected QUEUED or PROCESSING`)
    }

    // ── STEP 1: Collect ──
    await supabase.from('jobs').update({ status: 'PROCESSING' }).eq('id', jobId)
    const t1 = Date.now()
    console.log(`[${jobId}] STEP 1/4 — Collecting data for ${job.target} (${job.query_type})`)

    const rawData = await collectData({
      target: job.target,
      queryType: job.query_type,
    })

    const collectDetails: Record<string, unknown> = {}
    if (rawData) {
      if ('balance' in rawData) collectDetails.balance = rawData.balance
      if ('txCount' in rawData) collectDetails.txCount = rawData.txCount
      if ('isContract' in rawData) collectDetails.isContract = rawData.isContract
      if ('codeHash' in rawData) collectDetails.codeHash = rawData.codeHash
      if ('priceUsd' in rawData) collectDetails.priceUsd = rawData.priceUsd
      if ('priceChange24h' in rawData) collectDetails.priceChange24h = rawData.priceChange24h
      if ('dangerousFunctions' in rawData) collectDetails.dangerousFunctions = rawData.dangerousFunctions
      if ('holders' in rawData) collectDetails.holders = rawData.holders
      if ('error' in rawData) collectDetails.error = rawData.error
    }
    collectDetails.arcExplorer = `https://testnet.arcscan.app/address/${job.target}`

    traceSteps.push({
      step: 1,
      name: 'Data Collection',
      description: `Collecting on-chain data for ${job.target} (${job.query_type})`,
      durationMs: Date.now() - t1,
      details: collectDetails,
    })
    console.log(`[${jobId}] Collected:`, JSON.stringify(rawData).slice(0, 200))

    // ── STEP 2: Reason ──
    const t2 = Date.now()
    console.log(`[${jobId}] STEP 2/4 — Reasoning via Groq AI...`)
    const analysis = await reasonAboutData(
      rawData as Record<string, unknown>,
      job.query_type,
    )

    if (analysis.error) {
      throw new Error(`Analysis failed: ${analysis.error}`)
    }

    traceSteps.push({
      step: 2,
      name: 'AI Reasoning',
      description: 'Analyzing data via Groq llama-3.1-8b-instant',
      durationMs: Date.now() - t2,
      details: {
        model: 'llama-3.1-8b-instant',
        findingsCount: analysis.findings.length,
        confidence: analysis.confidence,
        riskScore: analysis.riskScore,
      },
    })
    console.log(`[${jobId}] Analysis: ${analysis.findings.length} findings, confidence ${analysis.confidence}`)

    // ── STEP 3: Validate ──
    const t3 = Date.now()
    console.log(`[${jobId}] STEP 3/4 — Validating result...`)
    await supabase.from('jobs').update({ status: 'VALIDATING' }).eq('id', jobId)

    const validation = validateResult(analysis)
    const checks = [
      `confidence >= 60: ${analysis.confidence >= 60 ? 'PASS' : 'FAIL'}`,
      `findings non-empty: ${analysis.findings.length > 0 ? 'PASS' : 'FAIL'}`,
      `riskScore valid: ${['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].includes(analysis.riskScore) ? 'PASS' : 'FAIL'}`,
      `summary >= 10 chars: ${analysis.summary && analysis.summary.trim().length >= 10 ? 'PASS' : 'FAIL'}`,
    ]

    if (!validation.valid) {
      traceSteps.push({
        step: 3,
        name: 'Validation',
        description: `Failed: ${validation.reason ?? 'Unknown validation error'}`,
        durationMs: Date.now() - t3,
        details: { valid: false, checks, reason: validation.reason },
      })

      await failJobOnChain(jobId, validation.reason ?? 'Validation failed')
      await supabase.from('jobs').update({
        status: 'FAILED',
        error_msg: validation.reason,
        completed_at: new Date().toISOString(),
        result: { reasoning_trace: { steps: traceSteps, totalDurationMs: Date.now() - pipelineStart } },
      }).eq('id', jobId)
      return
    }

    traceSteps.push({
      step: 3,
      name: 'Validation',
      description: 'All quality checks passed',
      durationMs: Date.now() - t3,
      details: { valid: true, checks },
    })
    console.log(`[${jobId}] Validation passed`)

    // ── STEP 4: Store on-chain ──
    const t4 = Date.now()
    console.log(`[${jobId}] STEP 4/4 — Storing result hash on-chain...`)
    const { txHash } = await storeResultHash(jobId, analysis)

    traceSteps.push({
      step: 4,
      name: 'On-Chain Settlement',
      description: `Result hash stored on Arc Testnet`,
      durationMs: Date.now() - t4,
      details: {
        contractAddress: process.env.ARGOS_CONTRACT_ADDRESS ?? '',
        txHash,
        arcExplorer: txHash ? `https://testnet.arcscan.app/tx/${txHash}` : '',
        paymentIn: job.payment_in ?? 0,
      },
    })

    await supabase.from('jobs').update({
      status: 'COMPLETED',
      result: { ...analysis, reasoning_trace: { steps: traceSteps, totalDurationMs: Date.now() - pipelineStart } },
      arc_tx_hash: txHash,
      completed_at: new Date().toISOString(),
    }).eq('id', jobId)

    console.log(`[${jobId}] ✅ Complete — txHash: ${txHash}`)

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error(`[${jobId}] ❌ Pipeline failed:`, msg)

    await supabase.from('jobs').update({
      status: 'FAILED',
      error_msg: msg,
      completed_at: new Date().toISOString(),
      result: { reasoning_trace: { steps: traceSteps, totalDurationMs: Date.now() - pipelineStart } },
    }).eq('id', jobId)

    try {
      await failJobOnChain(jobId, msg.slice(0, 200))
    } catch {
      // on-chain fail is non-critical
    }
  }
}
