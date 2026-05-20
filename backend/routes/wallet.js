const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateToken } = require('../middleware/auth');
const StellarSdk = require('@stellar/stellar-sdk');
const { sendTokaPayment, server } = require('../services/stellar');
const { v4: uuidv4 } = require('uuid');

router.use(authenticateToken);

// Get transaction history
router.get('/history', (req, res) => {
  try {
    let transactions;
    if (req.user.role === 'anchor') {
      transactions = db.prepare(`
        SELECT t.*, u.display_name as related_user_name, tu.display_name as user_name
        FROM transactions t
        LEFT JOIN users u ON t.related_user_id = u.id
        LEFT JOIN users tu ON t.user_id = tu.id
        WHERE t.family_id = ?
        ORDER BY t.created_at DESC
      `).all(req.user.family_id);
    } else {
      transactions = db.prepare(`
        SELECT t.*, u.display_name as related_user_name
        FROM transactions t
        LEFT JOIN users u ON t.related_user_id = u.id
        WHERE t.user_id = ?
        ORDER BY t.created_at DESC
      `).all(req.user.id);
    }
    res.json(transactions);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to retrieve transaction history' });
  }
});

// P2P Transfer between earners
router.post('/transfer', async (req, res) => {
  const { recipient_id, amount, sender_secret } = req.body;
  const senderId = req.user.id;
  const familyId = req.user.family_id;

  if (req.user.role !== 'earner') {
    return res.status(403).json({ error: 'Only earners can transfer funds' });
  }

  if (!recipient_id || !amount || parseFloat(amount) <= 0) {
    return res.status(400).json({ error: 'Invalid transfer details' });
  }

  try {
    const recipient = db.prepare('SELECT id, stellar_public_key, display_name FROM users WHERE id = ? AND family_id = ? AND role = "earner"').get(recipient_id, familyId);
    if (!recipient) {
      return res.status(404).json({ error: 'Recipient not found in your family' });
    }

    let txHash = null;
    if (sender_secret && familyId !== 'demo-family-id') {
      try {
        console.log(`P2P Transfer: Sending ${amount} TOKA to ${recipient.display_name}...`);
        txHash = await sendTokaPayment(sender_secret, recipient.stellar_public_key, amount);
      } catch (stellarErr) {
        console.error('Stellar P2P Transfer failed:', stellarErr.message);
        return res.status(400).json({ error: 'Stellar transaction failed. Make sure you have enough balance and trustlines.' });
      }
    }

    // Update database ledger for both parties
    db.transaction(() => {
      // Sender entry
      db.prepare(`
        INSERT INTO transactions (id, family_id, user_id, type, amount, description, related_user_id, tx_hash)
        VALUES (?, ?, ?, 'transfer_send', ?, ?, ?, ?)
      `).run(uuidv4(), familyId, senderId, amount, `Sent to ${recipient.display_name}`, recipient.id, txHash);

      // Recipient entry
      db.prepare(`
        INSERT INTO transactions (id, family_id, user_id, type, amount, description, related_user_id, tx_hash)
        VALUES (?, ?, ?, 'transfer_receive', ?, ?, ?, ?)
      `).run(uuidv4(), familyId, recipient.id, amount, `Received from ${req.user.name || 'Family Member'}`, senderId, txHash);
    })();

    res.json({ success: true, message: 'Transfer completed successfully', tx_hash: txHash });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Transfer failed' });
  }
});

// Savings deposit
router.post('/savings/deposit', async (req, res) => {
  const { amount, earner_secret } = req.body;
  const earnerId = req.user.id;
  const familyId = req.user.family_id;

  if (req.user.role !== 'earner') {
    return res.status(403).json({ error: 'Only earners can deposit to savings' });
  }

  if (!amount || parseFloat(amount) <= 0) {
    return res.status(400).json({ error: 'Invalid deposit amount' });
  }

  try {
    const family = db.prepare('SELECT vault_address FROM families WHERE id = ?').get(familyId);
    if (!family) {
      return res.status(404).json({ error: 'Family vault not found' });
    }

    let txHash = null;
    if (earner_secret && familyId !== 'demo-family-id') {
      try {
        console.log(`Savings Deposit: Sending ${amount} TOKA to Vault...`);
        txHash = await sendTokaPayment(earner_secret, family.vault_address, amount);
      } catch (stellarErr) {
        console.error('Savings deposit transfer failed:', stellarErr.message);
        return res.status(400).json({ error: 'On-chain deposit transaction failed.' });
      }
    }

    // Update database savings balance and log ledger
    db.transaction(() => {
      db.prepare('UPDATE users SET savings_balance = savings_balance + ? WHERE id = ?').run(amount, earnerId);
      
      db.prepare(`
        INSERT INTO transactions (id, family_id, user_id, type, amount, description, tx_hash)
        VALUES (?, ?, ?, 'deposit', ?, 'Deposited to Savings Vault', ?)
      `).run(uuidv4(), familyId, earnerId, amount, txHash);
    })();

    res.json({ success: true, message: 'Deposit successful' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to complete savings deposit' });
  }
});

// Savings withdrawal
router.post('/savings/withdraw', async (req, res) => {
  const { amount } = req.body;
  const earnerId = req.user.id;
  const familyId = req.user.family_id;

  if (req.user.role !== 'earner') {
    return res.status(403).json({ error: 'Only earners can withdraw from savings' });
  }

  if (!amount || parseFloat(amount) <= 0) {
    return res.status(400).json({ error: 'Invalid withdrawal amount' });
  }

  try {
    const earner = db.prepare('SELECT savings_balance, stellar_public_key FROM users WHERE id = ?').get(earnerId);
    if (!earner || earner.savings_balance < parseFloat(amount)) {
      return res.status(400).json({ error: 'Insufficient savings balance' });
    }

    // Look up parent secret key to release funds on-chain from Vault back to earner
    const getAnchor = db.prepare("SELECT stellar_secret_key FROM users WHERE family_id = ? AND role = 'anchor' AND stellar_secret_key IS NOT NULL LIMIT 1").get(familyId);
    
    let txHash = null;
    if (getAnchor && getAnchor.stellar_secret_key && familyId !== 'demo-family-id') {
      try {
        console.log(`Savings Withdrawal: Transferring ${amount} TOKA from Vault back to Child...`);
        txHash = await sendTokaPayment(getAnchor.stellar_secret_key, earner.stellar_public_key, amount);
      } catch (stellarErr) {
        console.error('Savings withdrawal payout failed:', stellarErr.message);
        return res.status(400).json({ error: 'On-chain payout transaction failed.' });
      }
    }

    // Update database
    db.transaction(() => {
      db.prepare('UPDATE users SET savings_balance = savings_balance - ? WHERE id = ?').run(amount, earnerId);
      
      db.prepare(`
        INSERT INTO transactions (id, family_id, user_id, type, amount, description, tx_hash)
        VALUES (?, ?, ?, 'withdraw', ?, 'Withdrew from Savings Vault', ?)
      `).run(uuidv4(), familyId, earnerId, amount, txHash);
    })();

    res.json({ success: true, message: 'Withdrawal successful' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to complete savings withdrawal' });
  }
});
// Configure taxes (Anchor only)
router.post('/taxes/configure', (req, res) => {
  const { tax_flat_amount, tax_percentage, tax_frequency, tax_description } = req.body;
  const familyId = req.user.family_id;

  if (req.user.role !== 'anchor') {
    return res.status(403).json({ error: 'Only anchors can configure tax rules' });
  }

  try {
    db.prepare(`
      UPDATE families 
      SET tax_flat_amount = ?, tax_percentage = ?, tax_frequency = ?, tax_description = ?
      WHERE id = ?
    `).run(tax_flat_amount || 0, tax_percentage || 0.0, tax_frequency || 'none', tax_description || 'Household Tax', familyId);

    res.json({ success: true, message: 'Taxes configured successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to configure tax rules' });
  }
});
// Configure savings interest rate (Anchor only)
router.post('/savings/interest/configure', (req, res) => {
  const { interest_rate } = req.body;
  const familyId = req.user.family_id;

  if (req.user.role !== 'anchor') {
    return res.status(403).json({ error: 'Only anchors can configure interest rates' });
  }

  try {
    db.prepare(`
      UPDATE families 
      SET interest_rate = ?
      WHERE id = ?
    `).run(interest_rate || 0.0, familyId);

    res.json({ success: true, message: 'Savings interest configured successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to configure savings interest' });
  }
});

// Manual tax collection trigger (Anchor only)
router.post('/taxes/collect', async (req, res) => {
  const familyId = req.user.family_id;

  if (req.user.role !== 'anchor') {
    return res.status(403).json({ error: 'Only anchors can trigger tax collection' });
  }

  try {
    const family = db.prepare('SELECT tax_flat_amount, tax_percentage, tax_description, vault_address FROM families WHERE id = ?').get(familyId);
    if (!family) {
      return res.status(404).json({ error: 'Family configuration not found' });
    }

    const earners = db.prepare('SELECT id, stellar_public_key, stellar_secret_key, display_name FROM users WHERE family_id = ? AND role = "earner"').all(familyId);
    let collectedCount = 0;

    for (const earner of earners) {
      const taxAmount = family.tax_flat_amount;
      if (taxAmount <= 0) continue;

      let txHash = null;
      if (earner.stellar_secret_key && familyId !== 'demo-family-id') {
        try {
          txHash = await sendTokaPayment(earner.stellar_secret_key, family.vault_address, taxAmount);
        } catch (stellarErr) {
          console.error(`Tax collection failed for earner ${earner.display_name}:`, stellarErr.message);
        }
      }

      // Record transaction
      db.prepare(`
        INSERT INTO transactions (id, family_id, user_id, type, amount, description, tx_hash)
        VALUES (?, ?, ?, 'tax', ?, ?, ?)
      `).run(uuidv4(), familyId, earner.id, taxAmount, family.tax_description || 'Household Tax Assessment', txHash);

      collectedCount++;
    }

    res.json({ success: true, message: `Collected household taxes from ${collectedCount} earners` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to execute manual tax collection' });
  }
});

// Top up Anchor's wallet with TOKA
router.post('/topup', async (req, res) => {
  const { amount } = req.body;
  const familyId = req.user.family_id;

  if (req.user.role !== 'anchor') {
    return res.status(403).json({ error: 'Only anchors can top up their wallet' });
  }

  if (!amount || parseFloat(amount) <= 0) {
    return res.status(400).json({ error: 'Invalid top-up amount' });
  }

  try {
    const anchor = db.prepare('SELECT stellar_public_key, stellar_secret_key FROM users WHERE id = ?').get(req.user.id);
    if (!anchor || !anchor.stellar_public_key) {
      return res.status(404).json({ error: 'Anchor wallet not initialized' });
    }

    let txHash = null;
    const issuerSecret = process.env.ISSUER_SECRET_KEY;
    if (issuerSecret && anchor.stellar_secret_key && familyId !== 'demo-family-id') {
      try {
        console.log(`Top Up: Minting ${amount} TOKA to Parent ${anchor.stellar_public_key}...`);
        const issuerKeypair = StellarSdk.Keypair.fromSecret(issuerSecret);
        const issuerPublicKey = process.env.ISSUER_PUBLIC_KEY || 'GCJN4BRUERW4BJTSSPZZ4AQPVJKSAEJTCFW4N47U6ULB323QCWDTIOL5';
        const TOKA_ASSET = new StellarSdk.Asset('TOKA', issuerPublicKey);
        const issuerAccount = await server.loadAccount(issuerKeypair.publicKey());
        
        const tx = new StellarSdk.TransactionBuilder(issuerAccount, {
          fee: StellarSdk.BASE_FEE,
          networkPassphrase: StellarSdk.Networks.TESTNET,
        })
          .addOperation(StellarSdk.Operation.payment({
            destination: anchor.stellar_public_key,
            asset: TOKA_ASSET,
            amount: amount.toString(),
          }))
          .setTimeout(30)
          .build();

        tx.sign(issuerKeypair);
        const result = await server.submitTransaction(tx);
        txHash = result.hash;
      } catch (stellarErr) {
        console.error('Stellar top-up transaction failed:', stellarErr.message);
        return res.status(400).json({ error: 'On-chain top-up transaction failed.' });
      }
    }

    // Insert topup database transaction log for parent
    db.prepare(`
      INSERT INTO transactions (id, family_id, user_id, type, amount, description, tx_hash)
      VALUES (?, ?, ?, 'deposit', ?, 'Wallet Balance Top Up', ?)
    `).run(uuidv4(), familyId, req.user.id, amount, txHash);

    res.json({ success: true, message: `Successfully topped up ${amount} TOKA`, tx_hash: txHash });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to complete top up' });
  }
});

module.exports = router;
