import { createAdminClient } from '@/lib/supabase/admin'
import { collectData } from './collector'
import { reasonAboutData } from './reasoner'
import { validateResult } from './validator'
import { storeResultHash } from './storer'
import { failJobOnChain, getJobFromChain } from '@/lib/arc/contract'

type JobRow = {
  id: string
  query: string
  query_type: 'wallet' | 'token' | 'contract'
  target: string
  status: string
  result?: unknown
  arc_tx_hash?: string
  error_msg?: string
}

export async function runAnalysis(jobId: string): Promise<void> {
  const supabase = createAdminClient()
  let job: JobRow | undefined

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
    if (job.status !== 'QUEUED') throw new Error(`Job ${jobId} is ${job.status}, not QUEUED`)

    // ── STEP 1: Collect ──
    await supabase.from('jobs').update({ status: 'PROCESSING' }).eq('id', jobId)
    console.log(`[${jobId}] STEP 1/4 — Collecting data for ${job.target} (${job.query_type})`)

    const rawData = await collectData({
      target: job.target,
      queryType: job.query_type,
    })
    console.log(`[${jobId}] Collected:`, JSON.stringify(rawData).slice(0, 200))

    // ── STEP 2: Reason ──
    console.log(`[${jobId}] STEP 2/4 — Reasoning via Groq AI...`)
    const analysis = await reasonAboutData(
      rawData as Record<string, unknown>,
      job.query_type,
    )

    if (analysis.error) {
      throw new Error(`Analysis failed: ${analysis.error}`)
    }
    console.log(`[${jobId}] Analysis: ${analysis.findings.length} findings, confidence ${analysis.confidence}`)

    // ── STEP 3: Validate ──
    console.log(`[${jobId}] STEP 3/4 — Validating result...`)
    await supabase.from('jobs').update({ status: 'VALIDATING' }).eq('id', jobId)

    const validation = validateResult(analysis)
    if (!validation.valid) {
      // Fail on-chain via validator wallet
      await failJobOnChain(jobId, validation.reason ?? 'Validation failed')
      await supabase.from('jobs').update({
        status: 'FAILED',
        error_msg: validation.reason,
        completed_at: new Date().toISOString(),
      }).eq('id', jobId)
      return
    }
    console.log(`[${jobId}] Validation passed`)

    // ── STEP 4: Store on-chain ──
    console.log(`[${jobId}] STEP 4/4 — Storing result hash on-chain...`)
    const { txHash } = await storeResultHash(jobId, analysis)

    await supabase.from('jobs').update({
      status: 'COMPLETED',
      result: analysis,
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
    }).eq('id', jobId)

    // Try to fail on-chain too
    try {
      await failJobOnChain(jobId, msg.slice(0, 200))
    } catch {
      // on-chain fail is non-critical
    }
  }
}
