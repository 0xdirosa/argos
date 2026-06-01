import { settleJobOnChain } from '@/lib/arc/contract'

export type StoreResult = {
  txHash: string | undefined
  resultHash: string
}

export async function storeResultHash(
  jobId: string,
  result: object,
): Promise<StoreResult> {
  const resultJson = JSON.stringify(result)
  const { txHash, resultHash } = await settleJobOnChain(jobId, resultJson)

  return { txHash, resultHash: resultHash ?? '' }
}
