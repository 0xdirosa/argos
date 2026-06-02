import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createJobOnChain } from '@/lib/arc/contract'
import crypto from 'crypto'

const DEMO_TARGET = '0x000000000000000000000000000000000000dead'
const PRICE = 0.50

export const dynamic = 'force-dynamic'

export async function POST() {
  try {
    const supabase = createAdminClient()
    const jobId = crypto.randomUUID()

    const { data: job, error: insertError } = await supabase
      .from('jobs')
      .insert({
        id: jobId,
        query: 'wallet analysis for 0x000...dEaD (demo)',
        query_type: 'wallet',
        target: DEMO_TARGET,
        status: 'QUEUED',
        payment_in: PRICE,
      })
      .select()
      .single()

    if (insertError || !job) {
      console.error('[POST /api/demo] insert error:', insertError)
      return NextResponse.json({ error: 'Failed to create demo job' }, { status: 500 })
    }

    let arcTxHash: string | undefined
    try {
      const { txHash } = await createJobOnChain(jobId, PRICE)
      arcTxHash = txHash
      await supabase.from('jobs').update({ arc_tx_hash: txHash }).eq('id', jobId)
    } catch (chainErr) {
      const msg = chainErr instanceof Error ? chainErr.message : String(chainErr)
      console.error(`[POST /api/demo] createJobOnChain failed for ${jobId}:`, msg)
      await supabase.from('jobs').update({
        status: 'FAILED',
        error_msg: `On-chain job creation failed: ${msg.slice(0, 200)}`,
        completed_at: new Date().toISOString(),
      }).eq('id', jobId)
      return NextResponse.json({ error: 'On-chain job creation failed' }, { status: 502 })
    }

    return NextResponse.json({ jobId, status: 'QUEUED', message: 'Demo analysis queued' }, { status: 201 })
  } catch (err) {
    console.error('[POST /api/demo]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
