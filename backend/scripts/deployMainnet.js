const StellarSdk = require('@stellar/stellar-sdk');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const server = new StellarSdk.Horizon.Server('https://horizon.stellar.org');

async function checkBalance(publicKey) {
  try {
    const account = await server.loadAccount(publicKey);
    const balance = account.balances.find(b => b.asset_type === 'native');
    return parseFloat(balance.balance);
  } catch (e) {
    return 0;
  }
}

async function run() {
  console.log('=== Toka Mainnet Deployment & Sponsor Setup ===\n');

  // Generate keys
  const deployer = StellarSdk.Keypair.random();
  const sponsor = StellarSdk.Keypair.random();
  const issuer = StellarSdk.Keypair.random();

  console.log('🚨 PLEASE FUND THESE MAINNET ACCOUNTS FROM YOUR FREIGHTER WALLET 🚨\n');
  
  console.log('1. DEPLOYER (Needs ~3 XLM for contract deployment)');
  console.log(`   Public Key: ${deployer.publicKey()}`);
  console.log(`   Secret Key: ${deployer.secret()}\n`);

  console.log('2. ISSUER (Needs ~1.5 XLM for token issuance)');
  console.log(`   Public Key: ${issuer.publicKey()}`);
  console.log(`   Secret Key: ${issuer.secret()}\n`);

  console.log('3. SPONSOR (Send your remaining ~17 XLM here to fund your users)');
  console.log(`   Public Key: ${sponsor.publicKey()}`);
  console.log(`   Secret Key: ${sponsor.secret()}\n`);

  console.log('Waiting for you to transfer funds... (Press CTRL+C to cancel if needed)');
  console.log('Polling for balances...\n');

  // Wait for balances
  let ready = false;
  while (!ready) {
    const depBal = await checkBalance(deployer.publicKey());
    const issBal = await checkBalance(issuer.publicKey());
    const sponBal = await checkBalance(sponsor.publicKey());
    
    process.stdout.write(`\rBalances -> Deployer: ${depBal} XLM | Issuer: ${issBal} XLM | Sponsor: ${sponBal} XLM`);

    if (depBal >= 2.5 && issBal >= 1.5 && sponBal >= 5) {
      console.log('\n\n✅ All accounts funded! Proceeding to deploy contract...\n');
      ready = true;
    } else {
      await new Promise(r => setTimeout(r, 5000));
    }
  }

  // Deploy Contract
  console.log('Building and Deploying Soroban Contract to Mainnet...');
  const contractDir = path.join(__dirname, '../../contracts/toka-task');
  
  try {
    // 1. Build
    execSync('stellar contract build', { cwd: contractDir, stdio: 'inherit' });
    
    // 2. Deploy
    const deployCmd = `stellar contract deploy --wasm target/wasm32-unknown-unknown/release/toka_task.wasm --source ${deployer.secret()} --network mainnet`;
    const contractId = execSync(deployCmd, { cwd: contractDir, encoding: 'utf8' }).trim();
    
    console.log(`\n🎉 Contract Deployed! ID: ${contractId}`);

    // Update .env files
    console.log('Updating .env files...');
    const backendEnvPath = path.join(__dirname, '../.env');
    let backendEnv = fs.readFileSync(backendEnvPath, 'utf8');
    
    backendEnv = backendEnv.replace(/CONTRACT_ID=.*/, `CONTRACT_ID="${contractId}"`);
    backendEnv = backendEnv.replace(/ISSUER_SECRET_KEY=.*/, `ISSUER_SECRET_KEY="${issuer.secret()}"`);
    
    if (!backendEnv.includes('SPONSOR_SECRET_KEY')) {
      backendEnv += `\nSPONSOR_SECRET_KEY="${sponsor.secret()}"\n`;
    } else {
      backendEnv = backendEnv.replace(/SPONSOR_SECRET_KEY=.*/, `SPONSOR_SECRET_KEY="${sponsor.secret()}"`);
    }
    
    fs.writeFileSync(backendEnvPath, backendEnv);
    
    const mobileEnvPath = path.join(__dirname, '../../mobile/.env');
    const mobileEnv = `EXPO_PUBLIC_CONTRACT_ID=${contractId}
EXPO_PUBLIC_ISSUER_PUBLIC_KEY=${issuer.publicKey()}
EXPO_PUBLIC_READONLY_PUBLIC_KEY=${sponsor.publicKey()}
`;
    fs.writeFileSync(mobileEnvPath, mobileEnv);

    console.log('✅ Deployment Complete! The backend and mobile app are now targeting Mainnet.');

  } catch (error) {
    console.error('\n❌ Deployment failed:', error.message);
  }
}

run();
