import { GatewayClient } from '@circle-fin/x402-batching/client'

export type BuyResult<T = unknown> = {
  data: T
  amountPaid: number
  transaction: string
}

export async function buyFromX402Service<T = unknown>(
  serviceUrl: string,
  body?: unknown,
  maxAmountUsdc: number = 0.01,
): Promise<BuyResult<T>> {
  const buyerKey = process.env.BUYER_PRIVATE_KEY
  if (!buyerKey) {
    throw new Error('BUYER_PRIVATE_KEY not set — cannot pay x402 services')
  }

  const gateway = new GatewayClient({
    chain: 'arcTestnet',
    privateKey: buyerKey as `0x${string}`,
  })

  const result = await gateway.pay<T>(serviceUrl, {
    method: body ? 'POST' : 'GET',
    body,
  })

  const amount = parseFloat(result.formattedAmount)
  if (amount > maxAmountUsdc) {
    throw new Error(
      `Payment ${amount} USDC exceeds max ${maxAmountUsdc} USDC for ${serviceUrl}`,
    )
  }

  return {
    data: result.data,
    amountPaid: amount,
    transaction: result.transaction,
  }
}

export async function checkGatewayBalance() {
  const buyerKey = process.env.BUYER_PRIVATE_KEY
  if (!buyerKey) return null

  const gateway = new GatewayClient({
    chain: 'arcTestnet',
    privateKey: buyerKey as `0x${string}`,
  })

  return gateway.getBalances()
}
