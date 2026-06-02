import { keccak256, toHex } from 'viem'
import { walletsClient, arcPublicClient, waitTxComplete } from '../circle/client'
import crypto from 'crypto'

const ArgosABI = [
  {
    name: 'createJob',
    type: 'function',
    inputs: [
      { name: 'jobId', type: 'bytes32' },
      { name: 'fee', type: 'uint256' },
    ],
  },
  {
    name: 'settleJob',
    type: 'function',
    inputs: [
      { name: 'jobId', type: 'bytes32' },
      { name: 'resultHash', type: 'bytes32' },
    ],
  },
  {
    name: 'failJob',
    type: 'function',
    inputs: [
      { name: 'jobId', type: 'bytes32' },
      { name: 'reason', type: 'string' },
    ],
  },
  {
    name: 'getJob',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'jobId', type: 'bytes32' }],
    outputs: [
      {
        type: 'tuple',
        components: [
          { name: 'jobId', type: 'bytes32' },
          { name: 'client', type: 'address' },
          { name: 'fee', type: 'uint256' },
          { name: 'resultHash', type: 'bytes32' },
          { name: 'status', type: 'uint8' },
        ],
      },
    ],
  },
] as const

function getContractAddress(): `0x${string}` {
  const addr = process.env.ARGOS_CONTRACT_ADDRESS
  if (!addr) throw new Error('ARGOS_CONTRACT_ADDRESS not set in env')
  return addr as `0x${string}`
}

export async function createJobOnChain(jobId: string, feeUsdc: number) {
  const jobIdBytes32 = keccak256(toHex(jobId))
  const feeInSmallestUnit = BigInt(Math.round(feeUsdc * 1_000_000))

  const { data } = await walletsClient.createContractExecutionTransaction({
    idempotencyKey: crypto.randomUUID(),
    walletId: process.env.CIRCLE_OWNER_WALLET_ID!,
    contractAddress: getContractAddress(),
    abiFunctionSignature: 'createJob(bytes32,uint256)',
    abiParameters: [jobIdBytes32, feeInSmallestUnit.toString()],
    fee: { type: 'level', config: { feeLevel: 'MEDIUM' } },
  })

  if (!data?.id) throw new Error('No transaction ID returned from Circle')
  const result = await waitTxComplete(data.id)
  return { txHash: result.txHash, jobIdBytes32 }
}

export async function settleJobOnChain(jobId: string, resultJson: string) {
  const jobIdBytes32 = keccak256(toHex(jobId))
  const resultHash = keccak256(toHex(resultJson))

  const { data } = await walletsClient.createContractExecutionTransaction({
    idempotencyKey: crypto.randomUUID(),
    walletId: process.env.CIRCLE_VALIDATOR_WALLET_ID!,
    contractAddress: getContractAddress(),
    abiFunctionSignature: 'settleJob(bytes32,bytes32)',
    abiParameters: [jobIdBytes32, resultHash],
    fee: { type: 'level', config: { feeLevel: 'MEDIUM' } },
  })

  if (!data?.id) throw new Error('No transaction ID returned from Circle')
  const result = await waitTxComplete(data.id)
  return { txHash: result.txHash, resultHash }
}

export async function failJobOnChain(jobId: string, reason: string) {
  const jobIdBytes32 = keccak256(toHex(jobId))

  const { data } = await walletsClient.createContractExecutionTransaction({
    idempotencyKey: crypto.randomUUID(),
    walletId: process.env.CIRCLE_VALIDATOR_WALLET_ID!,
    contractAddress: getContractAddress(),
    abiFunctionSignature: 'failJob(bytes32,string)',
    abiParameters: [jobIdBytes32, reason],
    fee: { type: 'level', config: { feeLevel: 'MEDIUM' } },
  })

  if (!data?.id) throw new Error('No transaction ID returned from Circle')
  const result = await waitTxComplete(data.id)
  return { txHash: result.txHash }
}

export async function getJobFromChain(jobId: string) {
  const jobIdBytes32 = keccak256(toHex(jobId))

  return arcPublicClient.readContract({
    address: getContractAddress(),
    abi: ArgosABI,
    functionName: 'getJob',
    args: [jobIdBytes32],
  })
}
