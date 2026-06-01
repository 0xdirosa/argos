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

export default function AgentStats({ onJobSelect }: { onJobSelect?: (id: string) => void }) {
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

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Total Earned" value={`${stats.total_earned.toFixed(2)} USDC`} color="text-success" />
        <StatCard label="Total Spent" value={`${stats.total_spent.toFixed(2)} USDC`} color="text-warning" />
        <StatCard label="Net Treasury" value={`${net.toFixed(2)} USDC`} color={net >= 0 ? 'text-success' : 'text-danger'} />
        <StatCard label="Jobs Completed" value={String(stats.job_count)} color="text-info" />
      </div>

      <div className="bg-surface border border-border rounded-xl p-4">
        <h3 className="text-sm font-medium text-muted mb-3">Earnings vs Spending</h3>
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-sm bg-success" />
            <span className="text-xs text-muted">Earned</span>
            <span className="text-sm font-mono font-semibold text-success">{stats.total_earned.toFixed(2)}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-sm bg-warning" />
            <span className="text-xs text-muted">Spent</span>
            <span className="text-sm font-mono font-semibold text-warning">{stats.total_spent.toFixed(2)}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-sm bg-accent" />
            <span className="text-xs text-muted">Net</span>
            <span className={`text-sm font-mono font-semibold ${net >= 0 ? 'text-success' : 'text-danger'}`}>
              {net.toFixed(2)}
            </span>
          </div>
          <span className="text-[10px] text-muted ml-auto">USDC</span>
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
                <th className="text-right px-4 py-2 font-medium w-10">Arc</th>
              </tr>
            </thead>
            <tbody>
              {jobs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-muted text-sm">
                    No jobs yet. Submit your first analysis above.
                  </td>
                </tr>
              ) : (
                jobs.map((job) => (
                  <tr
                    key={job.id}
                    onClick={() => onJobSelect?.(job.id)}
                    className="border-b border-border/50 hover:bg-surface-2 transition-colors cursor-pointer"
                  >
                    <td className="px-4 py-2.5 font-mono text-xs uppercase text-muted">{job.query_type}</td>
                    <td className="px-4 py-2.5 font-mono text-xs">{shortenAddress(job.target)}</td>
                    <td className="px-4 py-2.5"><StatusBadge status={job.status} /></td>
                    <td className="px-4 py-2.5 text-muted text-xs hidden sm:table-cell">
                      {new Date(job.created_at).toLocaleString()}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      {job.arc_tx_hash && (
                        <a
                          href={`https://testnet.arcscan.com/tx/${job.arc_tx_hash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center justify-center w-6 h-6 rounded hover:bg-surface text-muted hover:text-foreground transition-colors"
                          title="View on Arc Explorer"
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                            <polyline points="15 3 21 3 21 9" />
                            <line x1="10" y1="14" x2="21" y2="3" />
                          </svg>
                        </a>
                      )}
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
