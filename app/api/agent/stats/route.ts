import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const supabase = createAdminClient()

    const { data: agg, error } = await supabase
      .from('jobs')
      .select('status, payment_in')
      .in('status', ['COMPLETED', 'FAILED'])

    if (error) {
      console.error('[GET /api/agent/stats] query error:', error)
      return NextResponse.json(
        { total_earned: 0, total_spent: 0, job_count: 0, arc_agent_id: null },
        { status: 200 },
      )
    }

    const completed = (agg ?? []).filter(j => j.status === 'COMPLETED')
    const totalEarned = completed.reduce((sum, j) => sum + Number(j.payment_in ?? 0), 0)
    const jobCount = completed.length

    return NextResponse.json({
      total_earned: totalEarned,
      total_spent: 0,
      job_count: jobCount,
      arc_agent_id: process.env.CIRCLE_OWNER_ADDRESS ?? null,
    })
  } catch (err) {
    console.error('[GET /api/agent/stats]', err)
    return NextResponse.json(
      { total_earned: 0, total_spent: 0, job_count: 0, arc_agent_id: null },
      { status: 500 },
    )
  }
}
