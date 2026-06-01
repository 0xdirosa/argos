import 'dotenv/config'
import { createAdminClient } from '../lib/supabase/admin'
import { runAnalysis } from '../lib/agent/pipeline'

async function poll() {
  console.log(`[worker] Starting poll loop at ${new Date().toISOString()}`)

  while (true) {
    try {
      const supabase = createAdminClient()

      const { data: jobs, error } = await supabase
        .from('jobs')
        .select('id')
        .eq('status', 'QUEUED')
        .order('created_at', { ascending: true })
        .limit(5)

      if (error) {
        console.error(`[worker] Query error:`, error)
      } else if (jobs && jobs.length > 0) {
        console.log(`[worker] Found ${jobs.length} queued job(s)`)

        for (const job of jobs) {
          console.log(`[worker] Processing job ${job.id}...`)
          try {
            await runAnalysis(job.id)
            console.log(`[worker] ✅ Job ${job.id} completed`)
          } catch (err) {
            console.error(`[worker] ❌ Job ${job.id} failed:`, err)
          }
        }
      }
    } catch (err) {
      console.error(`[worker] Poll cycle error:`, err)
    }

    await new Promise((r) => setTimeout(r, 5000))
  }
}

poll().catch((err) => {
  console.error(`[worker] Fatal:`, err)
  process.exit(1)
})
