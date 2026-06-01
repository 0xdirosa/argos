import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const supabase = createAdminClient()
    const statusFilter = request.nextUrl.searchParams.get('status')
    const page = Math.max(1, parseInt(request.nextUrl.searchParams.get('page') ?? '1', 10))
    const limit = Math.min(100, Math.max(1, parseInt(request.nextUrl.searchParams.get('limit') ?? '10', 10)))
    const offset = (page - 1) * limit

    let query = supabase
      .from('jobs')
      .select('id, query_type, target, status, arc_tx_hash, created_at, completed_at', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (statusFilter) {
      const validStatuses = ['QUEUED', 'PROCESSING', 'VALIDATING', 'COMPLETED', 'FAILED']
      if (!validStatuses.includes(statusFilter)) {
        return NextResponse.json(
          { error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` },
          { status: 400 },
        )
      }
      query = query.eq('status', statusFilter)
    }

    const { data, error, count } = await query

    if (error) {
      console.error('[GET /api/jobs] query error:', error)
      return NextResponse.json({ error: 'Failed to fetch jobs' }, { status: 500 })
    }

    return NextResponse.json({
      jobs: data ?? [],
      page,
      limit,
      total: count ?? 0,
      totalPages: count ? Math.ceil(count / limit) : 0,
    })
  } catch (err) {
    console.error('[GET /api/jobs]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
