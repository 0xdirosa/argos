'use client'

import { useEffect, useState, useCallback } from 'react'

type Stats = {
  total_earned: number
  total_spent: number
  job_count: number
  arc_agent_id: string | null
}

type JobRow = {
  id: string
  query_type: string
  target: string
  status: string
  arc_tx_hash: string | null
  created_at: string
  completed_at: string | null
}

export default function AgentStats() {
  const [stats, setStats] = useState<Stats>({
    total_earned: 0, total_spent: 0, job_count: 0, arc_agent_id: null,
  })
  const [jobs, setJobs] = useState<JobRow[]>([])

  const fetchData = useCallback(async () => {
    try {
      const [statsRes, jobsRes] = await Promise.all([
        fetch('/api/agent/stats'),
        fetch('/api/jobs'),
      ])
      if (statsRes.ok) {
        const s = await statsRes.json()
        setStats(s)
      }
      if (jobsRes.ok) {
        const j = await jobsRes.json()
        setJobs(j)
      }
    } catch {
      // silent
    }
  }, [])

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 10000)
    return () => clearInterval(interval)
  }, [fetchData])

  const net = stats.total_earned - stats.total_spent
  const maxVal = Math.max(stats.total_earned, stats.total_spent, 0.01)

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          label="Total Earned"
          value={`${stats.total_earned.toFixed(2)} USDC`}
          color="text-success"
        />
        <StatCard
          label="Total Spent"
          value={`${stats.total_spent.toFixed(2)} USDC`}
          color="text-warning"
        />
        <StatCard
          label="Net Treasury"
          value={`${net.toFixed(2)} USDC`}
          color={net >= 0 ? 'text-success' : 'text-danger'}
        />
        <StatCard
          label="Jobs Completed"
          value={String(stats.job_count)}
          color="text-info"
        />
      </div>

      <div className="bg-surface border border-border rounded-xl p-4">
        <h3 className="text-sm font-medium text-muted mb-3">Earnings vs Spending</h3>
        <div className="flex items-end gap-3 h-24">
          <BarChart
            label="Earned"
            value={stats.total_earned}
            max={maxVal}
            color="bg-success"
          />
          <BarChart
            label="Spent"
            value={stats.total_spent}
            max={maxVal}
            color="bg-warning"
          />
          <BarChart
            label="Net"
            value={Math.max(net, 0)}
            max={maxVal}
            color={net >= 0 ? 'bg-accent' : 'bg-danger'}
          />
        </div>
      </div>

      <div className="bg-surface border border-border rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-border flex items-center justify-between">
          <h3 className="text-sm font-medium text-foreground">Recent Jobs</h3>
          <span className="text-xs text-muted">{jobs.length} jobs</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-muted text-xs uppercase tracking-wider">
                <th className="text-left px-4 py-2 font-medium">Type</th>
                <th className="text-left px-4 py-2 font-medium">Target</th>
                <th className="text-left px-4 py-2 font-medium">Status</th>
                <th className="text-left px-4 py-2 font-medium hidden sm:table-cell">Created</th>
              </tr>
            </thead>
            <tbody>
              {jobs.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-muted text-sm">
                    No jobs yet. Submit your first analysis above.
                  </td>
                </tr>
              ) : (
                jobs.map((job) => (
                  <tr key={job.id} className="border-b border-border/50 hover:bg-surface-2 transition-colors">
                    <td className="px-4 py-2.5 font-mono text-xs uppercase text-muted">{job.query_type}</td>
                    <td className="px-4 py-2.5 font-mono text-xs">{shortenAddress(job.target)}</td>
                    <td className="px-4 py-2.5"><StatusBadge status={job.status} /></td>
                    <td className="px-4 py-2.5 text-muted text-xs hidden sm:table-cell">
                      {new Date(job.created_at).toLocaleString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function StatCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="bg-surface border border-border rounded-xl p-4">
      <p className="text-xs text-muted mb-1">{label}</p>
      <p className={`text-lg font-semibold font-mono ${color}`}>{value}</p>
    </div>
  )
}

function BarChart({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = max > 0 ? (value / max) * 100 : 0
  return (
    <div className="flex-1 flex flex-col items-center gap-1">
      <div className="w-full bg-surface-2 rounded-full overflow-hidden" style={{ height: 80 }}>
        <div
          className={`${color} rounded-full transition-all duration-500 w-full`}
          style={{ height: `${Math.max(pct, 0)}%`, marginTop: `${100 - Math.max(pct, 0)}%` }}
        />
      </div>
      <span className="text-[10px] text-muted font-mono">{value.toFixed(1)}</span>
      <span className="text-[10px] text-muted">{label}</span>
    </div>
  )
}

export function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    QUEUED: 'bg-zinc-800 text-zinc-300',
    PROCESSING: 'bg-blue-900/50 text-blue-300',
    VALIDATING: 'bg-purple-900/50 text-purple-300',
    COMPLETED: 'bg-green-900/50 text-green-300',
    FAILED: 'bg-red-900/50 text-red-300',
  }
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium uppercase tracking-wider ${colors[status] ?? 'bg-zinc-800 text-zinc-300'}`}>
      {status === 'PROCESSING' && (
        <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-[pulse-dot_1.5s_ease-in-out_infinite] mr-1.5" />
      )}
      {status}
    </span>
  )
}

function shortenAddress(addr: string): string {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`
}
