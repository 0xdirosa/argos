import { initiateDeveloperControlledWalletsClient, generateEntitySecretCiphertext } from '@circle-fin/developer-controlled-wallets'
import { readFileSync } from 'fs'
import { join } from 'path'
import crypto from 'crypto'

function loadEnv() {
  const { parse } = require('dotenv')
  const envLocal = readFileSync(join(process.cwd(), '.env.local'), 'utf-8')
  const parsed = parse(envLocal)
  for (const [key, val] of Object.entries(parsed)) {
    if (val !== undefined && !process.env[key]) process.env[key] = val
  }
}

async function pollTxComplete(txId: string) {
  const client = initiateDeveloperControlledWalletsClient({
    apiKey: process.env.CIRCLE_API_KEY!,
    entitySecret: process.env.ENTITY_SECRET!,
  })
  const DONE = ['COMPLETE', 'FAILED', 'DENIED', 'CANCELLED']
  for (let i = 0; i < 30; i++) {
    const { data } = await client.getTransaction({ id: txId })
    const tx = data.transaction
    console.log(`   [${i + 1}/30] State: ${tx.state}${tx.contractAddress ? ` | Address: ${tx.contractAddress}` : ''}`)
    if (DONE.includes(tx.state)) return tx
    await new Promise(r => setTimeout(r, 3000))
  }
  throw new Error('Transaction timeout')
}

async function main() {
  loadEnv()

  const required = [
    'CIRCLE_API_KEY', 'ENTITY_SECRET', 'CIRCLE_OWNER_WALLET_ID',
    'CIRCLE_OWNER_ADDRESS', 'CIRCLE_VALIDATOR_ADDRESS',
  ]
  for (const key of required) {
    if (!process.env[key]) throw new Error(`Missing env: ${key}`)
  }

  console.log('📄 Reading compiled bytecode...')
  const artifactPath = join(process.cwd(), 'contracts/out/ArgosJobManager.sol/ArgosJobManager.json')
  const artifact = JSON.parse(readFileSync(artifactPath, 'utf-8'))
  const bytecode = artifact.bytecode.object
  console.log(`   Bytecode size: ${(bytecode.length / 2 - 1).toLocaleString()} bytes`)

  console.log('🔐 Generating entitySecretCiphertext...')
  const ciphertext = await generateEntitySecretCiphertext({
    apiKey: process.env.CIRCLE_API_KEY!,
    entitySecret: process.env.ENTITY_SECRET!,
  })

  console.log('🚀 Deploying ArgosJobManager to Arc Testnet via Circle API...')
  console.log(`   Owner    : ${process.env.CIRCLE_OWNER_ADDRESS}`)
  console.log(`   Validator: ${process.env.CIRCLE_VALIDATOR_ADDRESS}`)

  const res = await fetch('https://api.circle.com/v1/w3s/contracts/deploy', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.CIRCLE_API_KEY!}`,
    },
    body: JSON.stringify({
      idempotencyKey: crypto.randomUUID(),
      name: 'ArgosJobManager',
      description: 'Argos_Job_Manager_ERC8004',
      walletId: process.env.CIRCLE_OWNER_WALLET_ID!,
      blockchain: 'ARC-TESTNET',
      bytecode,
      abiJson: JSON.stringify(artifact.abi),
      constructorParameters: [
        process.env.CIRCLE_OWNER_ADDRESS!,
        process.env.CIRCLE_VALIDATOR_ADDRESS!,
      ],
      feeLevel: 'MEDIUM',
      entitySecretCiphertext: String(ciphertext),
    }),
  })

  const data = await res.json()
  if (!res.ok) {
    throw new Error(`Deploy failed: ${JSON.stringify(data)}`)
  }

  const { contractId, transactionId } = data.data
  console.log(`\n⏳ Deploy submitted! TxID: ${transactionId}, ContractID: ${contractId}`)
  console.log('⏳ Polling transaction until complete...')

  const tx = await pollTxComplete(transactionId)
  const contractAddress = tx.contractAddress

  if (tx.state !== 'COMPLETE') {
    throw new Error(`Deploy failed with state: ${tx.state}`)
  }

  console.log('\n✅ Deploy berhasil!')
  console.log('================================================')
  console.log(`ARGOS_CONTRACT_ADDRESS=${contractAddress}`)
  console.log('================================================')
  console.log(`Tx Hash  : ${tx.txHash}`)
  console.log(`Explorer : https://testnet.arcscan.app/tx/${tx.txHash}`)
  console.log(`Block    : ${tx.blockHeight}`)
  console.log(`Fee      : ${tx.networkFee} USDC`)
  console.log('\n⚠️  ARGOS_CONTRACT_ADDRESS sudah tersimpan di .env.local')
}

main().catch(err => {
  console.error('❌ Deploy gagal:', err)
  process.exit(1)
})
