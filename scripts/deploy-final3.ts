import crypto from 'crypto'
import { config } from 'dotenv'
import { readFileSync } from 'fs'
import { join } from 'path'
import { generateEntitySecretCiphertext } from '@circle-fin/developer-controlled-wallets'

config({ path: join(process.cwd(), '.env.local') })

async function main() {
  const apiKey = process.env.CIRCLE_API_KEY!
  const entitySecret = process.env.ENTITY_SECRET!
  const ciphertext = await generateEntitySecretCiphertext({ apiKey, entitySecret })

  const artifact = JSON.parse(readFileSync(join(process.cwd(), 'contracts/out/ArgosJobManager.sol/ArgosJobManager.json'), 'utf-8'))

  const body = {
    idempotencyKey: crypto.randomUUID(),
    name: 'ArgosJobManager',
    description: 'Argos_Job_Manager_ERC8004',
    walletId: process.env.CIRCLE_OWNER_WALLET_ID!,
    blockchain: 'ARC-TESTNET',
    bytecode: artifact.bytecode.object,
    abiJson: JSON.stringify(artifact.abi),
    constructorParameters: [
      process.env.CIRCLE_OWNER_ADDRESS!,
      process.env.CIRCLE_VALIDATOR_ADDRESS!,
    ],
    fee: { feeLevel: 'MEDIUM' },
    gasLimit: '1238265',
    gasPrice: '100000',
    entitySecretCiphertext: String(ciphertext),
  }

  console.log('Deploying ArgosJobManager...')
  const res = await fetch('https://api.circle.com/v1/w3s/contracts/deploy', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  })
  const data = await res.json()
  console.log('Status:', res.status)
  
  if (res.ok) {
    console.log('\n✅ Deploy submitted!')
    console.log(JSON.stringify(data, null, 2))
  } else {
    console.log('Error:', JSON.stringify(data, null, 2))
  }
}

main().catch(e => console.error('Fatal:', e))
