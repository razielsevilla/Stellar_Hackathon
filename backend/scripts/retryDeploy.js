const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const deployerSecret = 'SBCIWDJZ7BX7GQQNERNA6LFBD3JTH3TFN5SP2NPWZO6SLODBCPKFX25W';
const issuerSecret = 'SANWX3AZAK6SHKLHFGGESTGUJCKB3NTMN5CHXQAUTUKVRNXNRBRPEZRE';
const sponsorSecret = 'SAKYY4XSK2V76NFKLFUIW5BK22523I3T6N2UHTVPTMSURHWIDWSPWL6G';

const issuerPub = 'GD6EBK4PMDH7MHVFF2K53GYUNWWZFWYERGYXYURIX6722OMIKEMHCLTI';
const sponsorPub = 'GB55MDSV36WAQO6FHO6DBQ4TIKHWOKTBZCQ5CWADCFDQJLPRGEH3TBCK';
const deployerPub = 'GDJGKSFBJ5XV44AV2PSTS5ZQDOSSLD6ZYRBSUJQ25PKHIPTGP2LDUZ4U';

const rpcUrl = 'https://mainnet.sorobanrpc.com/';
const networkPassphrase = 'Public Global Stellar Network ; September 2015';

async function run() {
  try {
    const contractDir = path.join(__dirname, '../../contracts/toka-task');
    
    console.log('\nInstalling WASM...');
    const installCmd = `stellar contract install --wasm target/wasm32v1-none/release/toka_task.wasm --source ${deployerSecret} --rpc-url ${rpcUrl} --network-passphrase "${networkPassphrase}"`;
    const wasmHash = execSync(installCmd, { cwd: contractDir, encoding: 'utf8' }).trim();
    console.log(`✅ WASM Installed! Hash: ${wasmHash}`);

    console.log('\nDeploying Contract...');
    const deployCmd = `stellar contract deploy --wasm-hash ${wasmHash} --source ${deployerSecret} --rpc-url ${rpcUrl} --network-passphrase "${networkPassphrase}"`;
    const contractId = execSync(deployCmd, { cwd: contractDir, encoding: 'utf8' }).trim();
    console.log(`\n🎉 Contract Deployed! ID: ${contractId}`);

    // Update .env
    console.log('Updating .env files...');
    const backendEnvPath = path.join(__dirname, '../.env');
    let backendEnv = fs.readFileSync(backendEnvPath, 'utf8');
    
    backendEnv = backendEnv.replace(/CONTRACT_ID=.*/, `CONTRACT_ID="${contractId}"`);
    backendEnv = backendEnv.replace(/ISSUER_SECRET_KEY=.*/, `ISSUER_SECRET_KEY="${issuerSecret}"`);
    if (!backendEnv.includes('SPONSOR_SECRET_KEY')) {
      backendEnv += `\nSPONSOR_SECRET_KEY="${sponsorSecret}"\n`;
    } else {
      backendEnv = backendEnv.replace(/SPONSOR_SECRET_KEY=.*/, `SPONSOR_SECRET_KEY="${sponsorSecret}"`);
    }
    fs.writeFileSync(backendEnvPath, backendEnv);
    
    const mobileEnvPath = path.join(__dirname, '../../mobile/.env');
    const mobileEnv = `EXPO_PUBLIC_CONTRACT_ID=${contractId}
EXPO_PUBLIC_ISSUER_PUBLIC_KEY=${issuerPub}
EXPO_PUBLIC_READONLY_PUBLIC_KEY=${sponsorPub}
`;
    fs.writeFileSync(mobileEnvPath, mobileEnv);

    console.log('\n✅ Deployment Complete! The backend and mobile app are now targeting Mainnet.');

  } catch (error) {
    console.error('\n❌ Deployment failed:', error.message);
  }
}

run();
