import { fileURLToPath } from 'url'
import { dirname, resolve } from 'path'
import dotenv from 'dotenv'

const __dirname = dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: resolve(__dirname, '../.env.local') })

import { createAdminClient } from '../lib/supabase/admin'
import { runAnalysis } from '../lib/agent/pipeline'

let running = true

process.on('SIGINT', () => { console.log(`[worker] SIGINT received, shutting down...`); running = false })
process.on('SIGTERM', () => { console.log(`[worker] SIGTERM received, shutting down...`); running = false })

async function poll() {
  console.log(`[worker] Starting poll loop at ${new Date().toISOString()}`)

  while (running) {
    try {
      const supabase = createAdminClient()

      const { data: job, error } = await supabase
        .from('jobs')
        .select('id')
        .eq('status', 'QUEUED')
        .order('created_at', { ascending: true })
        .limit(1)
        .single()

      if (error && error.code !== 'PGRST116') {
        console.error(`[worker] Query error:`, error)
      } else if (job) {
        const claimed = await supabase
          .from('jobs')
          .update({ status: 'PROCESSING' })
          .eq('id', job.id)
          .eq('status', 'QUEUED')
          .select()
          .single()

        if (claimed.data) {
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

    if (!running) break
    await new Promise((r) => setTimeout(r, 5000))
  }

  console.log(`[worker] Poll loop exited at ${new Date().toISOString()}`)
}

poll().catch((err) => {
  console.error(`[worker] Fatal:`, err)
  process.exit(1)
})
