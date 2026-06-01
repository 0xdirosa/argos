import { arcPublicClient } from '@/lib/circle/client'
import { createPublicClient, http, keccak256 } from 'viem'
import { mainnet } from 'viem/chains'

const ethPublicClient = createPublicClient({
  chain: mainnet,
  transport: http('https://eth.llamarpc.com'),
})

type CollectorInput = { target: string; queryType: 'wallet' | 'token' | 'contract' }

export type RawData = {
  target: string
  queryType: string
  balance?: string
  txCount?: number
  recentTxHashes?: string[]
  codeHash?: string
  isContract?: boolean
  holders?: { address: string; balance: string }[]
  priceUsd?: number
  priceChange24h?: number
  dangerousFunctions?: string[]
  verificationStatus?: string
  error?: string
}

export async function collectData(input: CollectorInput): Promise<RawData> {
  const { target, queryType } = input
  const base: RawData = { target, queryType }

  try {
    const address = target as `0x${string}`

    if (queryType === 'wallet') {
      const [balance, txCount, code] = await Promise.all([
        arcPublicClient.getBalance({ address }).catch(() => BigInt(0)),
        arcPublicClient.getTransactionCount({ address }).catch(() => 0),
        arcPublicClient.getBytecode({ address }).catch(() => undefined),
      ])

      base.balance = (Number(balance) / 1e6).toFixed(2)
      base.txCount = txCount
      base.isContract = code !== undefined && code !== '0x'
    }

    if (queryType === 'token') {
      const [code, ethCode] = await Promise.all([
        arcPublicClient.getBytecode({ address }).catch(() => undefined),
        ethPublicClient.getBytecode({ address }).catch(() => undefined),
      ])
      base.isContract = (code && code !== '0x') || (ethCode && ethCode !== '0x')
      if (code && code !== '0x') base.codeHash = keccak256Hash(code as `0x${string}`).slice(0, 18)

      try {
        const cg = await fetch(
          `https://api.coingecko.com/api/v3/simple/token_price/ethereum?contract_addresses=${target}&vs_currencies=usd&include_24hr_change=true`,
        )
        if (cg.ok) {
          const json = await cg.json()
          const entry = json[target.toLowerCase()]
          if (entry) {
            base.priceUsd = entry.usd
            base.priceChange24h = entry.usd_24h_change
          }
        }
      } catch (_) {
        // coingecko failure is non-critical
      }
    }

    if (queryType === 'contract') {
      const code = await arcPublicClient.getBytecode({ address }).catch(() => undefined)
      if (code && code !== '0x') {
        base.isContract = true
        base.codeHash = keccak256Hash(code as `0x${string}`).slice(0, 18)

        const dangerous = [
          'selfdestruct', 'delegatecall', 'callcode',
          'suicide', 'tx.origin', 'address(this).balance',
        ]
        const codeStr = code.toLowerCase()
        base.dangerousFunctions = dangerous.filter(fn => codeStr.includes(fn.replace('.', '')))

        base.verificationStatus = 'UNVERIFIED'
      } else {
        base.isContract = false
        base.error = 'No bytecode found — not a contract'
      }
    }
  } catch (err) {
    base.error = err instanceof Error ? err.message : String(err)
  }

  return base
}

function keccak256Hash(data: `0x${string}`): string {
  return keccak256(data)
}
