require('dotenv').config();
const { rpc, Contract, TransactionBuilder, BASE_FEE, nativeToScVal, scValToNative, Keypair, Address } = require('@stellar/stellar-sdk');

const sorobanUrl = process.env.SOROBAN_RPC_URL || 'https://soroban-testnet.stellar.org';
const sorobanServer = new rpc.Server(sorobanUrl);
const networkPassphrase = process.env.NETWORK_PASSPHRASE || 'Test SDF Network ; September 2015';

const CONTRACT_ID = process.env.CONTRACT_ID || 'CC55Z5AYNCFCHUVEA3R2WNDQTYGOUWBF7QK3KMWEUANFB5JQMUGXIZLT';

async function invokeContract(callerSecret, functionName, args) {
  const callerKeypair = Keypair.fromSecret(callerSecret);
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

  return {
    result: txResult.returnValue ? scValToNative(txResult.returnValue) : null,
    txHash: sendResult.hash
  };
}

async function contractCreateTask(anchorSecret, title, rewardInToka, earnerPublicKey) {
  const rewardStroops = BigInt(Math.round(rewardInToka * 10_000_000));

  const { result, txHash } = await invokeContract(anchorSecret, 'create_task', [
    nativeToScVal(title, { type: 'string' }),
    nativeToScVal(rewardStroops, { type: 'i128' }),
    new Address(earnerPublicKey).toScVal(),
  ]);

  return { taskId: Number(result), txHash };
}

async function contractApproveTask(anchorSecret, taskId) {
  const { txHash } = await invokeContract(anchorSecret, 'approve_task', [
    nativeToScVal(taskId, { type: 'u64' }),
  ]);
  return txHash;
}

async function contractSubmitTask(earnerSecret, taskId, proofCid) {
  const { txHash } = await invokeContract(earnerSecret, 'submit_task', [
    nativeToScVal(taskId, { type: 'u64' }),
    nativeToScVal(proofCid, { type: 'string' }),
  ]);
  return txHash;
}

/**
 * Read a task from the Soroban contract.
 * Used by backend to verify state if needed.
 */
async function getTaskFromContract(taskId) {
  try {
    const readonlyKey = process.env.READONLY_PUBLIC_KEY || 'GAON6W3SHZFXCMPRCQLCEEJZMRKV6JEEBIUK22A2J574ZFAHU3P6ZCUN';
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
    return null;
  } catch (error) {
    console.error('Error fetching task from Soroban:', error);
    return null;
  }
}

module.exports = {
  sorobanServer,
  getTaskFromContract,
  contractCreateTask,
  contractApproveTask,
  contractSubmitTask,
};
