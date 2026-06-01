import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params

  try {
    const supabase = createAdminClient()

    const { data: job, error: fetchError } = await supabase
      .from('jobs')
      .select('id, status')
      .eq('id', id)
      .single()

    if (fetchError || !job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }

    if (job.status !== 'FAILED') {
      return NextResponse.json(
        { error: `Cannot retry job with status '${job.status}'. Only FAILED jobs can be retried.` },
        { status: 409 },
      )
    }

    const { error: updateError } = await supabase
      .from('jobs')
      .update({
        status: 'QUEUED',
        error_msg: null,
        completed_at: null,
        result: null,
        result_hash: null,
        arc_tx_hash: null,
      })
      .eq('id', id)

    if (updateError) {
      console.error(`[POST /api/jobs/${id}/retry] update error:`, updateError)
      return NextResponse.json({ error: 'Failed to retry job' }, { status: 500 })
    }

    return NextResponse.json({ id, status: 'QUEUED', message: 'Job queued for retry' })
  } catch (err) {
    console.error(`[POST /api/jobs/${id}/retry]`, err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
