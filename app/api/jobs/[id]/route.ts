import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params

  try {
    const supabase = createAdminClient()

    const { data, error } = await supabase
      .from('jobs')
      .select('id, status, error_msg, result, result_hash, arc_tx_hash, payment_in, created_at, completed_at')
      .eq('id', id)
      .single()

    if (error || !data) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }

    return NextResponse.json(data)
  } catch (err) {
    console.error(`[GET /api/jobs/${id}]`, err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
