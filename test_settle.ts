import dotenv from 'dotenv'
import { resolve } from 'path'
dotenv.config({ path: resolve('.env.local') })

import('./lib/arc/contract').then(({ settleJobOnChain }) => {
  settleJobOnChain('test-settle-' + Date.now(), '{"test":true}')
    .then(r => console.log('SUCCESS txHash:', r.txHash?.slice(0, 20)))
    .catch(e => console.error('FAIL:', e.message?.slice(0, 300)))
})
