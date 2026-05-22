require('dotenv').config();
const StellarSdk = require('@stellar/stellar-sdk');

const ENV = process.env.STELLAR_NETWORK || 'testnet';
const horizonUrl = process.env.HORIZON_URL || (ENV === 'mainnet' ? 'https://horizon.stellar.org' : 'https://horizon-testnet.stellar.org');
const networkPassphrase = ENV === 'mainnet' ? StellarSdk.Networks.PUBLIC : StellarSdk.Networks.TESTNET;

const server = new StellarSdk.Horizon.Server(horizonUrl);

/**
 * Watch for TOKA payments to/from the vault account.
 */
function watchVaultPayments(vaultPublicKey, onPayment) {
  console.log(`Starting to watch payments for vault: ${vaultPublicKey}`);
  server
    .payments()
    .forAccount(vaultPublicKey)
    .cursor('now')
    .stream({
      onmessage: (payment) => {
        // Here we just use XLM or native to represent TOKA for testnet if needed,
        // but checking 'TOKA' as per spec.
        if (
          payment.type === 'payment' &&
          (payment.asset_code === 'TOKA' || payment.asset_type === 'native') &&
          payment.to !== vaultPublicKey // outgoing
        ) {
          console.log(`Payment detected to ${payment.to}`);
          onPayment({
            to: payment.to,
            amount: payment.amount,
            txHash: payment.transaction_hash,
          });
        }
      },
      onerror: (err) => console.error('Stellar Horizon Stream error:', err),
    });
}

async function sendTokaPayment(anchorSecret, earnerPublicKey, amount) {
  const anchorKeypair = StellarSdk.Keypair.fromSecret(anchorSecret);
  const anchorAccount = await server.loadAccount(anchorKeypair.publicKey());
  
  const issuerPublicKey = process.env.ISSUER_PUBLIC_KEY || 'GCJN4BRUERW4BJTSSPZZ4AQPVJKSAEJTCFW4N47U6ULB323QCWDTIOL5';
  const TOKA_ASSET = new StellarSdk.Asset('TOKA', issuerPublicKey);

  const tx = new StellarSdk.TransactionBuilder(anchorAccount, {
    fee: StellarSdk.BASE_FEE,
    networkPassphrase: networkPassphrase,
  })
    .addOperation(StellarSdk.Operation.payment({
      destination: earnerPublicKey,
      asset: TOKA_ASSET,
      amount: amount.toString(),
    }))
    .setTimeout(30)
    .build();

  tx.sign(anchorKeypair);
  const result = await server.submitTransaction(tx);
  return result.hash;
}

async function verifyTokaBurn(txHash, fromPublicKey, vaultPublicKey, expectedAmount) {
  try {
    const tx = await server.transactions().transaction(txHash).call();
    if (!tx.successful) return false;

    const ops = await tx.operations();
    const paymentOp = ops.records.find(op => {
      const isPayment = op.type === 'payment';
      const isFrom = (op.source_account || tx.source_account) === fromPublicKey;
      const isTo = op.to === vaultPublicKey;
      const matchesAmount = parseFloat(op.amount) === parseFloat(expectedAmount);
      return isPayment && isFrom && isTo && matchesAmount;
    });
    
    return !!paymentOp;
  } catch (err) {
    console.error('Error verifying TOKA burn:', err);
    return false;
  }
}

async function getTokaBalance(publicKey) {
  try {
    const account = await server.loadAccount(publicKey);
    const balanceObj = account.balances.find(b => b.asset_code === 'TOKA');
    return balanceObj ? balanceObj.balance : '0.0';
  } catch (err) {
    console.error(`Error loading balance for ${publicKey}:`, err.message);
    return '0.0';
  }
}

module.exports = {
  server,
  networkPassphrase,
  watchVaultPayments,
  sendTokaPayment,
  verifyTokaBurn,
  getTokaBalance,
};

