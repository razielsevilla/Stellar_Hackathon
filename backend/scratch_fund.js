const StellarSdk = require('@stellar/stellar-sdk');
const axios = require('axios');
const db = require('./db/index');

const server = new StellarSdk.Horizon.Server('https://horizon-testnet.stellar.org');
const networkPassphrase = StellarSdk.Networks.TESTNET;

async function run() {
  try {
    // Get Maria and Carlo from DB
    const parentRow = db.prepare('SELECT stellar_secret_key, stellar_public_key FROM users WHERE role = ? AND display_name LIKE ?').get('anchor', '%Maria%');
    const childRow = db.prepare('SELECT stellar_secret_key, stellar_public_key FROM users WHERE role = ? AND display_name LIKE ?').get('earner', '%Carlo%');

    if (!parentRow || !childRow) {
      console.log('Could not find Maria or Carlo in the DB. Have they been seeded?');
      return;
    }

    const parentKeypair = StellarSdk.Keypair.fromSecret(parentRow.stellar_secret_key);
    const childKeypair = StellarSdk.Keypair.fromSecret(childRow.stellar_secret_key);

    console.log('Parent:', parentKeypair.publicKey());
    console.log('Child:', childKeypair.publicKey());

    // Generate new issuer
    const issuerKeypair = StellarSdk.Keypair.random();
    console.log('--- NEW ISSUER GENERATED ---');
    console.log('Issuer Public Key:', issuerKeypair.publicKey());
    console.log('Issuer Secret Key:', issuerKeypair.secret());

    // Fund issuer
    console.log('Funding issuer via Friendbot...');
    await axios.get(`https://friendbot.stellar.org?addr=${issuerKeypair.publicKey()}`);
    console.log('Issuer funded!');

    const TOKA_ASSET = new StellarSdk.Asset('TOKA', issuerKeypair.publicKey());

    // Create trustlines
    console.log('Creating trustlines...');
    
    // Parent Trustline
    const parentAccount = await server.loadAccount(parentKeypair.publicKey());
    const txParent = new StellarSdk.TransactionBuilder(parentAccount, { fee: StellarSdk.BASE_FEE, networkPassphrase })
      .addOperation(StellarSdk.Operation.changeTrust({ asset: TOKA_ASSET, limit: '1000000' }))
      .setTimeout(30).build();
    txParent.sign(parentKeypair);
    await server.submitTransaction(txParent);
    console.log('Parent trustline created!');

    // Child Trustline
    const childAccount = await server.loadAccount(childKeypair.publicKey());
    const txChild = new StellarSdk.TransactionBuilder(childAccount, { fee: StellarSdk.BASE_FEE, networkPassphrase })
      .addOperation(StellarSdk.Operation.changeTrust({ asset: TOKA_ASSET, limit: '1000000' }))
      .setTimeout(30).build();
    txChild.sign(childKeypair);
    await server.submitTransaction(txChild);
    console.log('Child trustline created!');

    // Mint 100 TOKA to Parent
    console.log('Minting 100 TOKA to Parent...');
    const issuerAccount = await server.loadAccount(issuerKeypair.publicKey());
    const txMint = new StellarSdk.TransactionBuilder(issuerAccount, { fee: StellarSdk.BASE_FEE, networkPassphrase })
      .addOperation(StellarSdk.Operation.payment({
        destination: parentKeypair.publicKey(),
        asset: TOKA_ASSET,
        amount: '100'
      }))
      .setTimeout(30).build();
    txMint.sign(issuerKeypair);
    await server.submitTransaction(txMint);
    
    console.log('100 TOKA successfully minted to Parent!');
    console.log('SUCCESS_ISSUER_PUBLIC_KEY=' + issuerKeypair.publicKey());

  } catch (err) {
    console.error('Script failed:', err.response ? err.response.data : err.message);
  }
}

run();
