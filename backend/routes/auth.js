const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { generateToken } = require('../middleware/auth');
const crypto = require('../services/crypto');
const StellarSdk = require('@stellar/stellar-sdk');
const { server, networkPassphrase } = require('../services/stellar');

// Sponsor a new account on Mainnet
router.post('/sponsor', async (req, res) => {
  const { public_key } = req.body;
  if (!public_key) return res.status(400).json({ error: 'public_key is required' });

  const sponsorSecret = process.env.SPONSOR_SECRET_KEY;
  if (!sponsorSecret) {
    return res.status(500).json({ error: 'SPONSOR_SECRET_KEY not configured' });
  }

  try {
    const sponsorKeypair = StellarSdk.Keypair.fromSecret(sponsorSecret);
    const sponsorAccount = await server.loadAccount(sponsorKeypair.publicKey());

    const transaction = new StellarSdk.TransactionBuilder(sponsorAccount, {
      fee: StellarSdk.BASE_FEE,
      networkPassphrase,
    })
      .addOperation(StellarSdk.Operation.createAccount({
        destination: public_key,
        startingBalance: '2.5'
      }))
      .setTimeout(30)
      .build();

    transaction.sign(sponsorKeypair);
    await server.submitTransaction(transaction);

    res.json({ success: true, message: 'Account successfully sponsored on Mainnet' });
  } catch (error) {
    console.error('Sponsor error:', error.response ? error.response.data : error);
    res.status(500).json({ error: 'Failed to sponsor account on Mainnet' });
  }
});

// Register a new family (Anchor)
router.post('/register', (req, res) => {
  const { vault_address, family_name, stellar_public_key, display_name, avatar_emoji, relationship } = req.body;
  
  if (!vault_address || !stellar_public_key) {
    return res.status(400).json({ error: 'vault_address and stellar_public_key are required' });
  }

  const familyId = uuidv4();
  const inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase();
  const userId = uuidv4();

  try {
    const insertFamily = db.prepare(
      'INSERT INTO families (id, vault_address, family_name, invite_code) VALUES (?, ?, ?, ?)'
    );
    insertFamily.run(familyId, vault_address, family_name || 'My Family', inviteCode);

    const insertUser = db.prepare(
      'INSERT INTO users (id, family_id, stellar_public_key, role, display_name, avatar_emoji, relationship) VALUES (?, ?, ?, ?, ?, ?, ?)'
    );
    insertUser.run(userId, familyId, stellar_public_key, 'anchor', display_name || 'Anchor', avatar_emoji || '👑', relationship || 'Parent');

    const token = generateToken({ id: userId, family_id: familyId, role: 'anchor', public_key: stellar_public_key });

    res.json({ token, user_id: userId, family_id: familyId, invite_code: inviteCode });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to register' });
  }
});

// Join an existing family (Anchor or Earner)
router.post('/join', (req, res) => {
  const { invite_code, stellar_public_key, display_name, avatar_emoji, age, savings_goal, role } = req.body;

  if (!invite_code || !stellar_public_key) {
    return res.status(400).json({ error: 'invite_code and stellar_public_key are required' });
  }

  const userRole = role === 'anchor' ? 'anchor' : 'earner';

  try {
    const getFamily = db.prepare('SELECT id FROM families WHERE invite_code = ?');
    const family = getFamily.get(invite_code);

    if (!family) {
      return res.status(404).json({ error: 'Invalid invite code' });
    }

    const userId = uuidv4();
    const insertUser = db.prepare(
      'INSERT INTO users (id, family_id, stellar_public_key, role, display_name, avatar_emoji, age, savings_goal) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    );
    
    insertUser.run(
      userId, 
      family.id, 
      stellar_public_key, 
      userRole, 
      display_name || (userRole === 'anchor' ? 'Co-Anchor' : 'Earner'), 
      avatar_emoji || (userRole === 'anchor' ? '👑' : '🏃'), 
      userRole === 'earner' && age ? parseInt(age, 10) : null, 
      userRole === 'earner' ? (savings_goal || 'Savings') : null
    );

    const token = generateToken({ id: userId, family_id: family.id, role: userRole, public_key: stellar_public_key });

    res.json({ token, user_id: userId, family_id: family.id, role: userRole });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to join family' });
  }
});

// Login an existing user by Stellar Public Key
router.post('/login', (req, res) => {
  const { stellar_public_key } = req.body;

  if (!stellar_public_key) {
    return res.status(400).json({ error: 'stellar_public_key is required' });
  }

  try {
    const getUser = db.prepare('SELECT * FROM users WHERE stellar_public_key = ?');
    const user = getUser.get(stellar_public_key);

    if (!user) {
      return res.status(404).json({ error: 'No account found with this Stellar public key. Please register first.' });
    }

    const token = generateToken({ 
      id: user.id, 
      family_id: user.family_id, 
      role: user.role, 
      public_key: user.stellar_public_key 
    });

    res.json({ 
      token, 
      user_id: user.id, 
      family_id: user.family_id, 
      role: user.role,
      display_name: user.display_name,
      avatar_emoji: user.avatar_emoji
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to login' });
  }
});

// Quick Demo Login for prototype
router.post('/demo-login', (req, res) => {
  const { role } = req.body; // 'Anchor' or 'Earner'

  if (!role || (role !== 'Anchor' && role !== 'Earner')) {
    return res.status(400).json({ error: 'Valid role is required (Anchor or Earner)' });
  }

  const dbRole = role === 'Anchor' ? 'anchor' : 'earner';

  try {
    const getUser = db.prepare('SELECT * FROM users WHERE role = ? AND family_id = ?');
    const user = getUser.get(dbRole, 'demo-family-id');

    if (!user) {
      return res.status(404).json({ error: 'Demo user not seeded yet. Please restart backend.' });
    }

    const token = generateToken({ 
      id: user.id, 
      family_id: user.family_id, 
      role: user.role, 
      public_key: user.stellar_public_key 
    });

    res.json({ 
      token, 
      user_id: user.id, 
      family_id: user.family_id, 
      stellar_public_key: user.stellar_public_key,
      stellar_secret_key: user.stellar_secret_key ? crypto.decrypt(user.stellar_secret_key) : process.env.DEMO_SECRET_KEY,
      display_name: user.display_name,
      avatar_emoji: user.avatar_emoji,
      invite_code: 'DEMO12'
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to log in as demo account' });
  }
});

module.exports = router;
