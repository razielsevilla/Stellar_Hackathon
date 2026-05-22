const db = require('./index');
const StellarSdk = require('@stellar/stellar-sdk');
const axios = require('axios');
const crypto = require('../services/crypto');

const horizonUrl = process.env.HORIZON_URL || 'https://horizon-testnet.stellar.org';
const server = new StellarSdk.Horizon.Server(horizonUrl);
const networkPassphrase = StellarSdk.Networks.TESTNET;
const issuerPublicKey = 'GCJN4BRUERW4BJTSSPZZ4AQPVJKSAEJTCFW4N47U6ULB323QCWDTIOL5';
const TOKA_ASSET = new StellarSdk.Asset('TOKA', issuerPublicKey);

async function seedDemoAccounts() {
  try {
    // Check if the demo family already exists
    const checkDemo = db.prepare('SELECT id FROM families WHERE invite_code = ?').get('DEMO12');
    
    if (checkDemo) {
      console.log('Demo accounts already seeded in database.');
      return;
    }

    console.log('--- Seeding Default Demo Accounts ---');
    
    // 1. Generate mathematically valid Stellar keypairs
    const anchorKey = StellarSdk.Keypair.random();
    const earnerKey = StellarSdk.Keypair.random();
    
    const familyId = 'demo-family-id';
    const anchorId = 'demo-anchor-id';
    const earnerId = 'demo-earner-id';
    const inviteCode = 'DEMO12';

    // 2. Insert into DB immediately so users can log in even while background funding takes place
    const insertFamily = db.prepare(
      'INSERT INTO families (id, vault_address, family_name, invite_code) VALUES (?, ?, ?, ?)'
    );
    insertFamily.run(familyId, anchorKey.publicKey(), 'Dela Cruz Family', inviteCode);

    const insertUser = db.prepare(
      `INSERT INTO users (id, family_id, stellar_public_key, stellar_secret_key, role, display_name, avatar_emoji, relationship, age, savings_goal) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );
    
    // Anchor (Parent)
    insertUser.run(
      anchorId, 
      familyId, 
      anchorKey.publicKey(), 
      crypto.encrypt(anchorKey.secret()), 
      'anchor', 
      'Maria Dela Cruz (Parent)', 
      '👩‍💼', 
      'Mother', 
      null, 
      null
    );

    // Earner (Child)
    insertUser.run(
      earnerId, 
      familyId, 
      earnerKey.publicKey(), 
      crypto.encrypt(earnerKey.secret()), 
      'earner', 
      'Carlo Dela Cruz (Child)', 
      '🦄', 
      null, 
      14, 
      'New PlayStation 5 🎮'
    );

    console.log('Demo accounts written to database successfully.');
    console.log(`Parent PublicKey: ${anchorKey.publicKey()}`);
    console.log(`Child PublicKey:  ${earnerKey.publicKey()}`);
    console.log('Shared Invite Code: DEMO12');

    // 3. Perform Stellar background funding & trustline setups asynchronously
    runStellarSetupInBackground(anchorKey, earnerKey);

  } catch (err) {
    console.error('Error during demo seeding:', err);
  }
}

async function runStellarSetupInBackground(anchorKey, earnerKey) {
  console.log('Starting asynchronous Stellar setups on Testnet...');
  
  // A. Fund Parent Vault via Friendbot
  try {
    console.log('Funding Demo Parent Vault via Friendbot...');
    await axios.get(`https://friendbot.stellar.org?addr=${encodeURIComponent(anchorKey.publicKey())}`);
    console.log('Demo Parent Vault funded successfully!');
  } catch (e) {
    console.error('Failed to fund Demo Parent Vault via Friendbot:', e.message);
  }

  // B. Fund Child Wallet via Friendbot
  try {
    console.log('Funding Demo Child Wallet via Friendbot...');
    await axios.get(`https://friendbot.stellar.org?addr=${encodeURIComponent(earnerKey.publicKey())}`);
    console.log('Demo Child Wallet funded successfully!');
  } catch (e) {
    console.error('Failed to fund Demo Child Wallet via Friendbot:', e.message);
  }

  // C. Create TOKA trustline for Child
  try {
    console.log('Setting up TOKA Trustline for Child Wallet...');
    const childAccount = await server.loadAccount(earnerKey.publicKey());
    const tx = new StellarSdk.TransactionBuilder(childAccount, {
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

    tx.sign(earnerKey);
    await server.submitTransaction(tx);
    console.log('TOKA Trustline established for Demo Child Wallet!');
  } catch (e) {
    console.error('Failed to establish TOKA Trustline for Child:', e.message);
  }
}

module.exports = seedDemoAccounts;
