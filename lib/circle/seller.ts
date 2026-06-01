import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { keccak256, toHex } from 'viem'

const ARC_TESTNET_NETWORK = 'eip155:5042002'
const ARC_TESTNET_USDC = '0x3600000000000000000000000000000000000000'
const ARC_TESTNET_GATEWAY_WALLET = '0x0077777d7EBA4688BDeF3E311b846F25870A19B9'

type GatewayOption = {
  scheme: string
  network: string
  asset: string
  amount: string
  payTo: string
  maxTimeoutSeconds: number
  extra: {
    name: string
    version: string
    verifyingContract: string
  }
}

function buildPaymentRequirements(priceUsdc: number): GatewayOption {
  const amount = Math.round(priceUsdc * 1_000_000)
  const sellerAddress = process.env.CIRCLE_OWNER_ADDRESS
  if (!sellerAddress) throw new Error('CIRCLE_OWNER_ADDRESS not set')

  return {
    scheme: 'exact',
    network: ARC_TESTNET_NETWORK,
    asset: ARC_TESTNET_USDC,
    amount: amount.toString(),
    payTo: sellerAddress,
    maxTimeoutSeconds: 345600,
    extra: {
      name: 'GatewayWalletBatched',
      version: '1',
      verifyingContract: ARC_TESTNET_GATEWAY_WALLET,
    },
  }
}

export function create402Response(priceUsdc: number, resourcePath: string): NextResponse {
  const requirements = buildPaymentRequirements(priceUsdc)

  const paymentRequired = {
    x402Version: 2,
    resource: {
      url: resourcePath,
      description: `Argos analysis (${priceUsdc} USDC)`,
      mimeType: 'application/json',
    },
    accepts: [requirements],
  }

  return new NextResponse(JSON.stringify({ error: 'Payment required' }), {
    status: 402,
    headers: {
      'Content-Type': 'application/json',
      'PAYMENT-REQUIRED': Buffer.from(JSON.stringify(paymentRequired)).toString('base64'),
    },
  })
}

export async function requireX402Payment(
  request: NextRequest,
  priceUsdc: number = parseFloat(process.env.PRICE_PER_ANALYSIS ?? '0.50'),
  resourcePath: string = '/api/jobs/analyze',
): Promise<{ paid: false } | { paid: true; amountPaid: number; payer: string }> {
  const paymentSignature = request.headers.get('payment-signature')

  if (!paymentSignature) {
    return { paid: false }
  }

  try {
    const { BatchFacilitatorClient } = await import('@circle-fin/x402-batching/server')
    const facilitator = new BatchFacilitatorClient()
    const requirements = buildPaymentRequirements(priceUsdc)

    const decoded = Buffer.from(paymentSignature, 'base64').toString('utf-8')
    const paymentPayload = JSON.parse(decoded)

    const verifyResult = await facilitator.verify(paymentPayload, requirements)
    if (!verifyResult.isValid) {
      throw new Error(`Payment verification failed: ${verifyResult.invalidReason}`)
    }

    const settleResult = await facilitator.settle(paymentPayload, requirements)
    if (!settleResult.success) {
      throw new Error(`Payment settlement failed: ${settleResult.errorReason}`)
    }

    const amountPaid = priceUsdc
    const payer = settleResult.payer ?? verifyResult.payer ?? 'unknown'

    try {
      const supabase = createAdminClient()
      await supabase.from('jobs').insert({
        payment_in: amountPaid,
        status: 'QUEUED',
        query: '',
        query_type: 'wallet',
        target: payer,
      })
    } catch {
      // non-critical
    }

    return { paid: true, amountPaid, payer }
  } catch (err) {
    throw err
  }
}

export function addPaymentResponseHeader(
  response: NextResponse,
  payer: string,
  txId?: string,
): NextResponse {
  response.headers.set(
    'PAYMENT-RESPONSE',
    Buffer.from(
      JSON.stringify({
        success: true,
        transaction: txId ?? null,
        network: ARC_TESTNET_NETWORK,
        payer,
      }),
    ).toString('base64'),
  )
  return response
}
