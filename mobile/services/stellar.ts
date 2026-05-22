import * as StellarSdk from '@stellar/stellar-sdk';
import SecureStore from '../utils/storage';
import {
  rpc,
  Contract,
  TransactionBuilder,
  BASE_FEE,
  nativeToScVal,
  Address,
  scValToNative,
  xdr,
} from '@stellar/stellar-sdk';

export const NETWORK: Record<string, any> = {
  testnet: {
    horizonUrl: 'https://horizon-testnet.stellar.org',
    sorobanRpc: 'https://soroban-testnet.stellar.org',
    passphrase: StellarSdk.Networks.PUBLIC,
    friendbot: null,
  },
  mainnet: {
    horizonUrl: 'https://horizon.stellar.org',
    sorobanRpc: 'https://soroban-mainnet.stellar.org',
    passphrase: StellarSdk.Networks.PUBLIC,
    friendbot: null,
  },
};

const ENV = process.env.EXPO_PUBLIC_STELLAR_NETWORK || 'testnet';

export const server = new StellarSdk.Horizon.Server(NETWORK[ENV].horizonUrl);
export const sorobanServer = new StellarSdk.rpc.Server(NETWORK[ENV].sorobanRpc);
export const networkPassphrase = NETWORK[ENV].passphrase;

// ─── Wallet Management ───────────────────────────────────────────────────────

export function generateKeypair() {
  const keypair = StellarSdk.Keypair.random();
  return {
    publicKey: keypair.publicKey(),
    secretKey: keypair.secret(),
  };
}

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

export async function fundMainnetAccount(publicKey: string): Promise<boolean> {
  try {
    const response = await api.post('/auth/sponsor', { public_key: publicKey });
    return response.data?.success === true;
  } catch (err) {
    console.error('Sponsor API error:', err);
    return false;
  }
}

// ─── TOKA Token Setup ────────────────────────────────────────────────────────

const issuerPublicKey = process.env.EXPO_PUBLIC_ISSUER_PUBLIC_KEY as string;
if (!issuerPublicKey) {
  console.error("EXPO_PUBLIC_ISSUER_PUBLIC_KEY is not set in environment.");
}

export const TOKA_ASSET = new StellarSdk.Asset('TOKA', issuerPublicKey);

export async function setupTokaIssuer(issuerSecret: string) {
  const issuerKeypair = StellarSdk.Keypair.fromSecret(issuerSecret);
  const issuerAccount = await server.loadAccount(issuerKeypair.publicKey());
  console.log('TOKA issuer ready:', issuerKeypair.publicKey());
  console.log('TOKA asset:', TOKA_ASSET.getCode(), TOKA_ASSET.getIssuer());
}

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
        limit: '1000000',
      })
    )
    .setTimeout(30)
    .build();

  transaction.sign(earnerKeypair);
  const result = await server.submitTransaction(transaction);
  return result.hash;
}

export async function mintTokaToVault(
  issuerSecret: string,
  vaultPublicKey: string,
  amount: string
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

export async function burnToka(
  earnerSecret: string,
  vaultPublicKey: string,
  amount: string
): Promise<string> {
  const earnerKeypair = StellarSdk.Keypair.fromSecret(earnerSecret);
  const earnerAccount = await server.loadAccount(earnerKeypair.publicKey());

  const transaction = new StellarSdk.TransactionBuilder(earnerAccount, {
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

  transaction.sign(earnerKeypair);
  const result = await server.submitTransaction(transaction);
  return result.hash;
}

export async function sendTokaPayment(
  senderSecret: string,
  recipientPublicKey: string,
  amount: string | number
): Promise<string> {
  const senderKeypair = StellarSdk.Keypair.fromSecret(senderSecret);
  const senderAccount = await server.loadAccount(senderKeypair.publicKey());

  const transaction = new StellarSdk.TransactionBuilder(senderAccount, {
    fee: StellarSdk.BASE_FEE,
    networkPassphrase,
  })
    .addOperation(
      StellarSdk.Operation.payment({
        destination: recipientPublicKey,
        asset: TOKA_ASSET,
        amount: amount.toString(),
      })
    )
    .setTimeout(30)
    .build();

  transaction.sign(senderKeypair);
  const result = await server.submitTransaction(transaction);
  return result.hash;
}

// ─── Reading Balances ────────────────────────────────────────────────────────

export async function getTokaBalance(publicKey: string): Promise<string> {
  try {
    const account = await server.loadAccount(publicKey);
    const tokaBalance = account.balances.find(
      (b) =>
        b.asset_type !== 'native' &&
        (b as any).asset_code === 'TOKA' &&
        (b as any).asset_issuer === issuerPublicKey
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

// ─── Soroban Contract Invocation ─────────────────────────────────────────────

const CONTRACT_ID = process.env.EXPO_PUBLIC_CONTRACT_ID as string;
if (!CONTRACT_ID) {
  console.error("EXPO_PUBLIC_CONTRACT_ID is not set in environment.");
}


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

  const simResult = await sorobanServer.simulateTransaction(transaction);
  if (rpc.Api.isSimulationError(simResult)) {
    throw new Error(`Simulation failed: ${simResult.error}`);
  }

  const preparedTx = rpc.assembleTransaction(transaction, simResult).build();
  preparedTx.sign(callerKeypair);

  const sendResult = await sorobanServer.sendTransaction(preparedTx);
  if (sendResult.status === 'ERROR') {
    throw new Error(`Submit failed: ${sendResult.errorResult}`);
  }

  let txResult;
  do {
    await new Promise((r) => setTimeout(r, 2000));
    txResult = await sorobanServer.getTransaction(sendResult.hash);
  } while (txResult.status === rpc.Api.GetTransactionStatus.NOT_FOUND);

  if (txResult.status === rpc.Api.GetTransactionStatus.FAILED) {
    throw new Error('Transaction failed');
  }

  return txResult.returnValue ? scValToNative(txResult.returnValue) : null;
}

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
  // Use a generic test key if readonly key is not defined
  const readonlyKey = process.env.EXPO_PUBLIC_READONLY_PUBLIC_KEY as string;
  if (!readonlyKey) throw new Error("EXPO_PUBLIC_READONLY_PUBLIC_KEY is missing");

  const callerAccount = await sorobanServer.getAccount(readonlyKey);
  const contract = new Contract(CONTRACT_ID);
  const tx = new TransactionBuilder(callerAccount, {
    fee: BASE_FEE,
    networkPassphrase,
  })
    .addOperation(contract.call('get_task', nativeToScVal(taskId, { type: 'u64' })))
    .setTimeout(30)
    .build();

  const sim = await sorobanServer.simulateTransaction(tx);
  if (rpc.Api.isSimulationSuccess(sim) && sim.result) {
    return scValToNative(sim.result.retval);
  }
  throw new Error('Could not read task');
}

// ─── Transaction History ─────────────────────────────────────────────────────

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
