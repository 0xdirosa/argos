import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireX402Payment, create402Response, addPaymentResponseHeader } from '@/lib/circle/seller'
import { createJobOnChain } from '@/lib/arc/contract'
import { runAnalysis } from '@/lib/agent/pipeline'
import crypto from 'crypto'

const PRICE = parseFloat(process.env.PRICE_PER_ANALYSIS ?? '0.50')

export async function POST(request: NextRequest) {
  try {
    const payment = await requireX402Payment(request, PRICE, '/api/analyze')

    if (!payment.paid) {
      return create402Response(PRICE, '/api/analyze')
    }

    const body = await request.json()
    const { target, queryType } = body

    if (!target || !queryType) {
      return NextResponse.json(
        { error: 'Missing required fields: target, queryType' },
        { status: 400 },
      )
    }

    if (!['wallet', 'token', 'contract'].includes(queryType)) {
      return NextResponse.json(
        { error: 'queryType must be one of: wallet, token, contract' },
        { status: 400 },
      )
    }

    if (!/^0x[a-fA-F0-9]{40}$/.test(target)) {
      return NextResponse.json(
        { error: 'target must be a valid EVM address (0x...)' },
        { status: 400 },
      )
    }

    const supabase = createAdminClient()
    const jobId = crypto.randomUUID()

    const { data: job, error: insertError } = await supabase
      .from('jobs')
      .insert({
        id: jobId,
        query: `${queryType} analysis for ${target}`,
        query_type: queryType,
        target: target.toLowerCase(),
        status: 'QUEUED',
        payment_in: PRICE,
      })
      .select()
      .single()

    if (insertError || !job) {
      console.error('[POST /api/analyze] insert error:', insertError)
      return NextResponse.json({ error: 'Failed to create job' }, { status: 500 })
    }

    let arcTxHash: string | undefined
    try {
      const { txHash } = await createJobOnChain(jobId, PRICE)
      arcTxHash = txHash

      await supabase
        .from('jobs')
        .update({ arc_tx_hash: txHash })
        .eq('id', jobId)
    } catch (chainErr) {
      console.error(`[POST /api/analyze] createJobOnChain failed for ${jobId}:`, chainErr)
    }

    runAnalysis(jobId).catch((err) =>
      console.error(`[background] runAnalysis(${jobId}) failed:`, err),
    )

    const response = NextResponse.json(
      { jobId, status: 'QUEUED', message: 'Analysis queued' },
      { status: 201 },
    )

    return addPaymentResponseHeader(response, payment.payer, arcTxHash)
  } catch (err) {
    console.error('[POST /api/analyze]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
