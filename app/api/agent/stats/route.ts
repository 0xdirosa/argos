import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const supabase = createAdminClient()

    const { data, error } = await supabase
      .from('agent_state')
      .select('total_earned, total_spent, job_count, arc_agent_id')
      .eq('id', 1)
      .single()

    if (error || !data) {
      return NextResponse.json(
        { total_earned: 0, total_spent: 0, job_count: 0, arc_agent_id: null },
        { status: 200 },
      )
    }

    return NextResponse.json(data)
  } catch (err) {
    console.error('[GET /api/agent/stats]', err)
    return NextResponse.json(
      { total_earned: 0, total_spent: 0, job_count: 0, arc_agent_id: null },
      { status: 500 },
    )
  }
}
