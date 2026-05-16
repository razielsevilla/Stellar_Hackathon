# 🌐 STELLAR_INTEGRATION.md — Stellar SDK Guide

## Installation

```bash
npm install @stellar/stellar-sdk
```

---

## 1. Network Configuration

```typescript
// services/stellar.ts
import * as StellarSdk from '@stellar/stellar-sdk';

export const NETWORK = {
  testnet: {
    horizonUrl: 'https://horizon-testnet.stellar.org',
    sorobanRpc: 'https://soroban-testnet.stellar.org',
    passphrase: StellarSdk.Networks.TESTNET,
    friendbot: 'https://friendbot.stellar.org',
  },
  mainnet: {
    horizonUrl: 'https://horizon.stellar.org',
    sorobanRpc: 'https://soroban-mainnet.stellar.org',
    passphrase: StellarSdk.Networks.PUBLIC,
    friendbot: null,
  },
};

const ENV = process.env.STELLAR_NETWORK || 'testnet';

export const server = new StellarSdk.Horizon.Server(NETWORK[ENV].horizonUrl);
export const sorobanServer = new StellarSdk.SorobanRpc.Server(NETWORK[ENV].sorobanRpc);
export const networkPassphrase = NETWORK[ENV].passphrase;
```

---

## 2. Wallet Management

### 2a. Generate a New Keypair (First-Time User)

```typescript
// Generate a brand new wallet
export function generateKeypair() {
  const keypair = StellarSdk.Keypair.random();
  return {
    publicKey: keypair.publicKey(),
    secretKey: keypair.secret(),
  };
}
```

### 2b. Store Keypair Securely (Expo SecureStore)

```typescript
import * as SecureStore from 'expo-secure-store';

export async function saveKeypair(secretKey: string) {
  await SecureStore.setItemAsync('stellar_secret', secretKey);
}

export async function loadKeypair(): Promise<StellarSdk.Keypair | null> {
  const secret = await SecureStore.getItemAsync('stellar_secret');
  if (!secret) return null;
  return StellarSdk.Keypair.fromSecret(secret);
}

export async function getPublicKey(): Promise<string | null> {
  const keypair = await loadKeypair();
  return keypair ? keypair.publicKey() : null;
}
```

### 2c. Fund Account on Testnet (Friendbot)

```typescript
export async function fundTestnetAccount(publicKey: string): Promise<boolean> {
  try {
    const response = await fetch(
      `https://friendbot.stellar.org?addr=${encodeURIComponent(publicKey)}`
    );
    return response.ok;
  } catch (err) {
    console.error('Friendbot error:', err);
    return false;
  }
}
```

---

## 3. TOKA Token Setup

### 3a. Issue TOKA Token (Run Once — Issuer Account)

```typescript
// This creates the TOKA asset issued by the issuer account
// Run this script ONCE to set up the token

export const TOKA_ASSET = new StellarSdk.Asset('TOKA', process.env.ISSUER_PUBLIC_KEY!);

export async function setupTokaIssuer(issuerSecret: string) {
  const issuerKeypair = StellarSdk.Keypair.fromSecret(issuerSecret);
  const issuerAccount = await server.loadAccount(issuerKeypair.publicKey());

  // Lock the issuer (set auth_required, auth_revocable off, and set low threshold high)
  // For MVP, we skip locking — the issuer can mint at will
  console.log('TOKA issuer ready:', issuerKeypair.publicKey());
  console.log('TOKA asset:', TOKA_ASSET.getCode(), TOKA_ASSET.getIssuer());
}
```

### 3b. Create a Trustline (Child's Wallet Must Accept TOKA)

```typescript
// Every new earner wallet needs to trust TOKA before receiving it
export async function createTrustline(earnerSecret: string): Promise<string> {
  const earnerKeypair = StellarSdk.Keypair.fromSecret(earnerSecret);
  const earnerAccount = await server.loadAccount(earnerKeypair.publicKey());

  const transaction = new StellarSdk.TransactionBuilder(earnerAccount, {
    fee: StellarSdk.BASE_FEE,
    networkPassphrase,
  })
    .addOperation(
      StellarSdk.Operation.changeTrust({
        asset: TOKA_ASSET,
        limit: '1000000', // max TOKA this wallet can hold
      })
    )
    .setTimeout(30)
    .build();

  transaction.sign(earnerKeypair);
  const result = await server.submitTransaction(transaction);
  return result.hash;
}
```

### 3c. Mint TOKA to the Vault (Fund the Family)

```typescript
export async function mintTokaToVault(
  issuerSecret: string,
  vaultPublicKey: string,
  amount: string  // e.g. "1000" for 1000 TOKA
): Promise<string> {
  const issuerKeypair = StellarSdk.Keypair.fromSecret(issuerSecret);
  const issuerAccount = await server.loadAccount(issuerKeypair.publicKey());

  const transaction = new StellarSdk.TransactionBuilder(issuerAccount, {
    fee: StellarSdk.BASE_FEE,
    networkPassphrase,
  })
    .addOperation(
      StellarSdk.Operation.payment({
        destination: vaultPublicKey,
        asset: TOKA_ASSET,
        amount,
      })
    )
    .setTimeout(30)
    .build();

  transaction.sign(issuerKeypair);
  const result = await server.submitTransaction(transaction);
  return result.hash;
}
```

---

## 4. Reading Balances

```typescript
export async function getTokaBalance(publicKey: string): Promise<string> {
  try {
    const account = await server.loadAccount(publicKey);
    const tokaBalance = account.balances.find(
      (b) =>
        b.asset_type !== 'native' &&
        (b as any).asset_code === 'TOKA' &&
        (b as any).asset_issuer === process.env.ISSUER_PUBLIC_KEY
    );
    return tokaBalance ? tokaBalance.balance : '0';
  } catch {
    return '0';
  }
}

export async function getXlmBalance(publicKey: string): Promise<string> {
  try {
    const account = await server.loadAccount(publicKey);
    const xlm = account.balances.find((b) => b.asset_type === 'native');
    return xlm ? xlm.balance : '0';
  } catch {
    return '0';
  }
}
```

---

## 5. Soroban Contract Invocation (Frontend)

```typescript
import {
  SorobanRpc,
  Contract,
  TransactionBuilder,
  BASE_FEE,
  nativeToScVal,
  Address,
  scValToNative,
  xdr,
} from '@stellar/stellar-sdk';

const CONTRACT_ID = process.env.CONTRACT_ID!;

// ── Helper: invoke a Soroban contract function ───────────────────────────────
export async function invokeContract(
  callerSecret: string,
  functionName: string,
  args: xdr.ScVal[]
): Promise<any> {
  const callerKeypair = StellarSdk.Keypair.fromSecret(callerSecret);
  const callerAccount = await sorobanServer.getAccount(callerKeypair.publicKey());

  const contract = new Contract(CONTRACT_ID);

  const transaction = new TransactionBuilder(callerAccount, {
    fee: BASE_FEE,
    networkPassphrase,
  })
    .addOperation(contract.call(functionName, ...args))
    .setTimeout(30)
    .build();

  // Simulate first
  const simResult = await sorobanServer.simulateTransaction(transaction);
  if (SorobanRpc.Api.isSimulationError(simResult)) {
    throw new Error(`Simulation failed: ${simResult.error}`);
  }

  // Assemble and sign
  const preparedTx = SorobanRpc.assembleTransaction(transaction, simResult).build();
  preparedTx.sign(callerKeypair);

  // Submit
  const sendResult = await sorobanServer.sendTransaction(preparedTx);
  if (sendResult.status === 'ERROR') {
    throw new Error(`Submit failed: ${sendResult.errorResult}`);
  }

  // Poll for result
  let txResult;
  do {
    await new Promise((r) => setTimeout(r, 2000));
    txResult = await sorobanServer.getTransaction(sendResult.hash);
  } while (txResult.status === SorobanRpc.Api.GetTransactionStatus.NOT_FOUND);

  if (txResult.status === SorobanRpc.Api.GetTransactionStatus.FAILED) {
    throw new Error('Transaction failed');
  }

  return txResult.returnValue ? scValToNative(txResult.returnValue) : null;
}

// ── Specific Contract Calls ──────────────────────────────────────────────────

export async function contractCreateTask(
  anchorSecret: string,
  title: string,
  rewardInToka: number,
  earnerPublicKey: string
): Promise<number> {
  const rewardStroops = BigInt(Math.round(rewardInToka * 10_000_000));

  const taskId = await invokeContract(anchorSecret, 'create_task', [
    nativeToScVal(title, { type: 'string' }),
    nativeToScVal(rewardStroops, { type: 'i128' }),
    new Address(earnerPublicKey).toScVal(),
  ]);

  return Number(taskId);
}

export async function contractSubmitTask(
  earnerSecret: string,
  taskId: number,
  proofCid: string
): Promise<void> {
  await invokeContract(earnerSecret, 'submit_task', [
    nativeToScVal(taskId, { type: 'u64' }),
    nativeToScVal(proofCid, { type: 'string' }),
  ]);
}

export async function contractApproveTask(
  anchorSecret: string,
  taskId: number
): Promise<void> {
  await invokeContract(anchorSecret, 'approve_task', [
    nativeToScVal(taskId, { type: 'u64' }),
  ]);
}

export async function contractGetTask(taskId: number): Promise<any> {
  // Read-only: use simulateTransaction only
  const callerAccount = await sorobanServer.getAccount(process.env.READONLY_PUBLIC_KEY!);
  const contract = new Contract(CONTRACT_ID);
  const tx = new TransactionBuilder(callerAccount, {
    fee: BASE_FEE,
    networkPassphrase,
  })
    .addOperation(contract.call('get_task', nativeToScVal(taskId, { type: 'u64' })))
    .setTimeout(30)
    .build();

  const sim = await sorobanServer.simulateTransaction(tx);
  if (SorobanRpc.Api.isSimulationSuccess(sim) && sim.result) {
    return scValToNative(sim.result.retval);
  }
  throw new Error('Could not read task');
}
```

---

## 6. Transaction History

```typescript
export async function getTransactionHistory(publicKey: string, limit = 20) {
  const payments = await server
    .payments()
    .forAccount(publicKey)
    .order('desc')
    .limit(limit)
    .call();

  return payments.records
    .filter((p: any) =>
      p.type === 'payment' &&
      p.asset_code === 'TOKA'
    )
    .map((p: any) => ({
      type: p.from === publicKey ? 'sent' : 'received',
      amount: p.amount,
      counterparty: p.from === publicKey ? p.to : p.from,
      timestamp: p.created_at,
      txHash: p.transaction_hash,
    }));
}
```

---

## 7. Horizon Event Streaming (Backend Webhook)

```javascript
// backend/services/stellar.js — listen for incoming TOKA payments
const StellarSdk = require('@stellar/stellar-sdk');
const server = new StellarSdk.Horizon.Server(process.env.HORIZON_URL);

function watchVaultPayments(vaultPublicKey, onPayment) {
  server
    .payments()
    .forAccount(vaultPublicKey)
    .cursor('now')
    .stream({
      onmessage: (payment) => {
        if (
          payment.type === 'payment' &&
          payment.asset_code === 'TOKA' &&
          payment.to !== vaultPublicKey // outgoing
        ) {
          onPayment({
            to: payment.to,
            amount: payment.amount,
            txHash: payment.transaction_hash,
          });
        }
      },
      onerror: (err) => console.error('Stream error:', err),
    });
}

module.exports = { watchVaultPayments };
```

---

## 8. Account Setup Flow (New User Onboarding)

```
New Anchor (Parent):
  1. generateKeypair() → save to SecureStore
  2. fundTestnetAccount(publicKey) → Friendbot
  3. createTrustline(secret) → accepts TOKA
  4. mintTokaToVault(issuerSecret, vaultPublicKey, "500") → fund vault
  5. initialize contract → set admin, token, max_reward

New Earner (Child):
  1. generateKeypair() → save to SecureStore
  2. fundTestnetAccount(publicKey) → Friendbot (need min 1 XLM for trustline)
  3. createTrustline(secret) → accepts TOKA
  4. Join family via invite code → backend links publicKey to family
```

---

## Common Errors & Fixes

| Error | Cause | Fix |
|-------|-------|-----|
| `op_no_trust` | Earner wallet hasn't trusted TOKA | Call `createTrustline()` first |
| `op_underfunded` | Vault doesn't have enough TOKA | Mint more TOKA to vault |
| `tx_bad_auth` | Wrong signer for operation | Ensure correct keypair is signing |
| `Simulation failed` | Contract logic error | Check contract function args/types |
| `Account not found` | Account not on Stellar yet | Fund via Friendbot or send XLM |
| `op_low_reserve` | Account XLM below minimum | Send more XLM (0.5 per trustline) |
