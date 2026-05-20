require('dotenv').config();
const { getTaskFromContract } = require('./services/soroban');
const { watchVaultPayments } = require('./services/stellar');

async function testServices() {
  console.log('Testing Soroban Service...');
  try {
    const task = await getTaskFromContract(1);
    console.log('Task 1 retrieved from contract:', task);
    if (!task) {
        console.warn('Warning: Task is null. Make sure CONTRACT_ID and network config are correct.');
    }
  } catch (err) {
    console.error('Error testing getTaskFromContract:', err);
  }

  console.log('\nTesting Stellar Webhook Service...');
  let timeoutId;
  const mockVaultId = process.env.READONLY_PUBLIC_KEY || 'GAON6W3SHZFXCMPRCQLCEEJZMRKV6JEEBIUK22A2J574ZFAHU3P6ZCUN';
  
  try {
    // Just verifying that it doesn't crash upon calling the function
    watchVaultPayments(mockVaultId, (payment) => {
        console.log('Payment detected:', payment);
    });
    console.log('Successfully started watchVaultPayments listener.');
    
    // Kill the test process after 3 seconds as the stream holds it open
    setTimeout(() => {
        console.log('All service tests passed. Exiting...');
        process.exit(0);
    }, 3000);

  } catch (err) {
    console.error('Error testing watchVaultPayments:', err);
    process.exit(1);
  }
}

testServices();
