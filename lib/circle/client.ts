import { initiateDeveloperControlledWalletsClient } from '@circle-fin/developer-controlled-wallets'
import { defineChain, createPublicClient, http } from 'viem'

export const arcTestnet = defineChain({
  id: 5042002,
  name: 'Arc Testnet',
  nativeCurrency: { name: 'USDC', symbol: 'USDC', decimals: 6 },
  rpcUrls: {
    default: { http: [process.env.ARC_RPC_URL ?? 'https://rpc.testnet.arc.network'] },
  },
  blockExplorers: {
    default: { name: 'Arc Explorer', url: 'https://testnet.arcscan.app' },
  },
  testnet: true,
})

export const arcPublicClient = createPublicClient({
  chain: arcTestnet,
  transport: http(),
})

let _walletsClient: ReturnType<typeof initiateDeveloperControlledWalletsClient> | null = null

export function getWalletsClient() {
  if (!_walletsClient) {
    _walletsClient = initiateDeveloperControlledWalletsClient({
      apiKey: process.env.CIRCLE_API_KEY!,
      entitySecret: process.env.ENTITY_SECRET!,
    })
  }
  return _walletsClient
}

const TERMINAL = ['COMPLETE', 'FAILED', 'DENIED', 'CANCELLED'] as const

export async function waitTxComplete(txId: string, maxAttempts = 30) {
  for (let i = 0; i < maxAttempts; i++) {
    const { data } = await getWalletsClient().getTransaction({ id: txId })
    const tx = data?.transaction
    if (!tx) {
      await new Promise(r => setTimeout(r, 2000))
      continue
    }

    if (TERMINAL.includes(tx.state as typeof TERMINAL[number])) {
      if (tx.state !== 'COMPLETE') {
        throw new Error(`Transaction ${tx.state}: ${txId}`)
      }
      return {
        txHash: tx.txHash as string | undefined,
        state: tx.state,
        contractAddress: tx.contractAddress as string | undefined,
      }
    }

    await new Promise(r => setTimeout(r, 2000))
  }
  throw new Error(`Transaction timeout after ${maxAttempts} attempts: ${txId}`)
}
