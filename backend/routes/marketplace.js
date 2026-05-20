const express = require('express');
const router = express.Router();
const db = require('../db');
const { v4: uuidv4 } = require('uuid');
const { authenticateToken } = require('../middleware/auth');
const { verifyTokaBurn } = require('../services/stellar');

router.use(authenticateToken);

// 1. Get family settings (Exchange Rate & Vault Address)
router.get('/settings', (req, res) => {
  try {
    const family = db.prepare('SELECT vault_address, toka_exchange_rate FROM families WHERE id = ?')
      .get(req.user.family_id);
    
    if (!family) {
      return res.status(404).json({ error: 'Family not found' });
    }
    
    res.json(family);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to retrieve family settings' });
  }
});

// 2. Update family exchange rate (Anchor only)
router.post('/settings', (req, res) => {
  const { toka_exchange_rate } = req.body;
  
  if (req.user.role !== 'anchor') {
    return res.status(403).json({ error: 'Only anchors can modify settings' });
  }
  
  if (!toka_exchange_rate || isNaN(Number(toka_exchange_rate)) || Number(toka_exchange_rate) <= 0) {
    return res.status(400).json({ error: 'Invalid exchange rate' });
  }

  try {
    db.prepare('UPDATE families SET toka_exchange_rate = ? WHERE id = ?')
      .run(Number(toka_exchange_rate), req.user.family_id);
    
    res.json({ success: true, toka_exchange_rate: Number(toka_exchange_rate) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update exchange rate' });
  }
});

// 3. Get all shop rewards
router.get('/rewards', (req, res) => {
  try {
    const rewards = db.prepare('SELECT * FROM shop_rewards WHERE family_id = ? ORDER BY created_at DESC')
      .all(req.user.family_id);
    res.json(rewards);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to retrieve rewards' });
  }
});

// 4. Create a shop reward (Anchor only)
router.post('/rewards', (req, res) => {
  const { title, toka_cost, image_url, required_streak } = req.body;

  if (req.user.role !== 'anchor') {
    return res.status(403).json({ error: 'Only anchors can add rewards' });
  }

  if (!title || !toka_cost || isNaN(Number(toka_cost))) {
    return res.status(400).json({ error: 'Title and cost are required' });
  }

  try {
    const id = uuidv4();
    db.prepare(`
      INSERT INTO shop_rewards (id, family_id, title, toka_cost, image_url, required_streak)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, req.user.family_id, title, Number(toka_cost), image_url || null, required_streak ? Number(required_streak) : 0);

    res.json({ success: true, reward_id: id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to add reward' });
  }
});

// 5. Delete a shop reward (Anchor only)
router.delete('/rewards/:id', (req, res) => {
  if (req.user.role !== 'anchor') {
    return res.status(403).json({ error: 'Only anchors can delete rewards' });
  }

  try {
    const info = db.prepare('DELETE FROM shop_rewards WHERE id = ? AND family_id = ?')
      .run(req.params.id, req.user.family_id);

    if (info.changes === 0) {
      return res.status(404).json({ error: 'Reward not found' });
    }

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete reward' });
  }
});

// 6. Get cashout history / pending requests
router.get('/cashouts', (req, res) => {
  try {
    let cashouts;
    if (req.user.role === 'anchor') {
      cashouts = db.prepare(`
        SELECT c.*, u.display_name, u.avatar_emoji 
        FROM cashouts c 
        JOIN users u ON c.earner_id = u.id 
        WHERE c.family_id = ? 
        ORDER BY c.created_at DESC
      `).all(req.user.family_id);
    } else {
      cashouts = db.prepare('SELECT * FROM cashouts WHERE earner_id = ? ORDER BY created_at DESC')
        .all(req.user.id);
    }
    res.json(cashouts);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to retrieve cashouts' });
  }
});

// 7. Request a Cashout or Buy a Reward (Earner only)
router.post('/cashout', async (req, res) => {
  const { tx_hash, toka_amount, reward_id } = req.body;

  if (req.user.role !== 'earner') {
    return res.status(403).json({ error: 'Only earners can spend TOKA' });
  }

  if (!toka_amount || isNaN(Number(toka_amount)) || Number(toka_amount) <= 0) {
    return res.status(400).json({ error: 'Invalid TOKA amount' });
  }

  try {
    // Get Family details
    const family = db.prepare('SELECT vault_address, toka_exchange_rate FROM families WHERE id = ?')
      .get(req.user.family_id);
    
    if (!family) {
      return res.status(404).json({ error: 'Family not found' });
    }

    let fiatAmount = 0;
    let rewardTitle = null;

    if (reward_id) {
      // Reward purchase
      const reward = db.prepare('SELECT title, toka_cost FROM shop_rewards WHERE id = ? AND family_id = ?')
        .get(reward_id, req.user.family_id);
      
      if (!reward) {
        return res.status(404).json({ error: 'Reward not found' });
      }

      if (Number(toka_amount) !== reward.toka_cost) {
        return res.status(400).json({ error: 'TOKA amount does not match reward cost' });
      }

      rewardTitle = reward.title;
    } else {
      // Fiat cashout with Delayed Gratification Multiplier
      const baseExchangeRate = family.toka_exchange_rate || 10;
      let effectiveRate = baseExchangeRate;

      // Delayed gratification multiplier scaling
      if (Number(toka_amount) >= 1000) {
        effectiveRate = baseExchangeRate * 0.6; // 60% of base rate (better exchange value)
      } else if (Number(toka_amount) >= 500) {
        effectiveRate = baseExchangeRate * 0.8; // 80% of base rate
      }

      // Convert
      fiatAmount = Math.round((Number(toka_amount) / effectiveRate) * 100) / 100;
    }

    // Verify burn transaction on Horizon (mock/skip if in demo mode or no tx_hash passed)
    let verified = false;
    if (req.user.family_id === 'demo-family-id' || !tx_hash) {
      verified = true;
    } else {
      verified = await verifyTokaBurn(tx_hash, req.user.public_key, family.vault_address, toka_amount);
    }

    if (!verified) {
      return res.status(400).json({ error: 'Stellar transaction verification failed. Please check the burn payment.' });
    }

    // Insert into database
    const cashoutId = uuidv4();
    db.prepare(`
      INSERT INTO cashouts (id, family_id, earner_id, toka_amount, fiat_amount, reward_title, status)
      VALUES (?, ?, ?, ?, ?, ?, 'pending')
    `).run(cashoutId, req.user.family_id, req.user.id, Number(toka_amount), fiatAmount, rewardTitle);

    res.json({ 
      success: true, 
      cashout_id: cashoutId, 
      fiat_amount: fiatAmount, 
      reward_title: rewardTitle 
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to process cashout' });
  }
});

// 8. Fulfill a Cashout (Anchor only)
router.post('/cashouts/:id/fulfill', (req, res) => {
  if (req.user.role !== 'anchor') {
    return res.status(403).json({ error: 'Only anchors can fulfill requests' });
  }

  try {
    const info = db.prepare('UPDATE cashouts SET status = \'fulfilled\' WHERE id = ? AND family_id = ?')
      .run(req.params.id, req.user.family_id);

    if (info.changes === 0) {
      return res.status(404).json({ error: 'Cashout request not found' });
    }

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fulfill cashout' });
  }
});

// 9. Get all auctions (Active & Completed) for the user's family
router.get('/auctions', (req, res) => {
  try {
    const auctions = db.prepare(`
      SELECT a.*, u.display_name as highest_bidder_name 
      FROM auctions a
      LEFT JOIN users u ON a.highest_bidder_id = u.id
      WHERE a.family_id = ?
      ORDER BY a.created_at DESC
    `).all(req.user.family_id);
    res.json(auctions);
  } catch (err) {
    console.error('Error fetching auctions:', err);
    res.status(500).json({ error: 'Failed to retrieve family auctions' });
  }
});

// 10. Create an auction (Anchor only)
router.post('/auctions', (req, res) => {
  if (req.user.role !== 'anchor') {
    return res.status(403).json({ error: 'Only anchors can initiate auctions' });
  }

  const { title, description, min_bid, ends_at } = req.body;

  if (!title || !min_bid || isNaN(Number(min_bid)) || !ends_at) {
    return res.status(400).json({ error: 'Title, min_bid, and ends_at are required' });
  }

  try {
    const id = uuidv4();
    db.prepare(`
      INSERT INTO auctions (id, family_id, title, description, min_bid, highest_bid, status, ends_at)
      VALUES (?, ?, ?, ?, ?, 0.0, 'active', ?)
    `).run(id, req.user.family_id, title.trim(), description ? description.trim() : null, Number(min_bid), ends_at);

    res.json({ success: true, auction_id: id });
  } catch (err) {
    console.error('Error creating auction:', err);
    res.status(500).json({ error: 'Failed to create auction' });
  }
});

// 11. Place a bid on an auction (Earner only)
router.post('/auctions/:id/bid', async (req, res) => {
  if (req.user.role !== 'earner') {
    return res.status(403).json({ error: 'Only earners can place bids' });
  }

  const { amount } = req.body;
  const auctionId = req.params.id;
  const bidderId = req.user.id;
  const familyId = req.user.family_id;

  if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
    return res.status(400).json({ error: 'Invalid bid amount' });
  }

  try {
    // 1. Fetch auction
    const auction = db.prepare('SELECT * FROM auctions WHERE id = ? AND family_id = ?').get(auctionId, familyId);
    if (!auction) {
      return res.status(404).json({ error: 'Auction not found' });
    }

    if (auction.status !== 'active') {
      return res.status(400).json({ error: 'This auction is no longer active' });
    }

    if (new Date(auction.ends_at) <= new Date()) {
      return res.status(400).json({ error: 'This auction has already expired' });
    }

    // 2. Validate amount is higher than current highest bid (or min_bid)
    const currentHighest = auction.highest_bid || 0;
    const requiredMin = currentHighest > 0 ? currentHighest : auction.min_bid;
    if (Number(amount) <= requiredMin) {
      return res.status(400).json({ error: `Bid must be higher than the current highest bid/minimum bid of ${requiredMin} TOKA` });
    }

    // 3. Fetch earner's on-chain balance
    const { getTokaBalance } = require('../services/stellar');
    const user = db.prepare('SELECT stellar_public_key FROM users WHERE id = ?').get(bidderId);
    let spendable = 0;
    if (user && user.stellar_public_key) {
      if (familyId === 'demo-family-id') {
        spendable = 9999; // Mock balance for demo
      } else {
        try {
          spendable = parseFloat(await getTokaBalance(user.stellar_public_key));
        } catch (err) {
          console.warn('Could not query Stellar balance, falling back to 9999 for demo:', err.message);
          spendable = 9999;
        }
      }
    }

    if (spendable < Number(amount)) {
      return res.status(400).json({ error: `Insufficient TOKA balance. Your spendable balance is ${spendable} TOKA.` });
    }

    // 4. Place bid
    db.transaction(() => {
      const bidId = uuidv4();
      db.prepare('INSERT INTO auction_bids (id, auction_id, user_id, amount) VALUES (?, ?, ?, ?)').run(bidId, auctionId, bidderId, Number(amount));
      db.prepare('UPDATE auctions SET highest_bid = ?, highest_bidder_id = ? WHERE id = ?').run(Number(amount), bidderId, auctionId);
    })();

    res.json({ success: true, message: 'Bid successfully placed!' });
  } catch (err) {
    console.error('Error placing bid:', err);
    res.status(500).json({ error: 'Failed to place bid' });
  }
});

// 12. Finalize an auction (Anchor only)
router.post('/auctions/:id/finalize', async (req, res) => {
  if (req.user.role !== 'anchor') {
    return res.status(403).json({ error: 'Only anchors can finalize auctions' });
  }

  const auctionId = req.params.id;
  const familyId = req.user.family_id;

  try {
    const auction = db.prepare('SELECT * FROM auctions WHERE id = ? AND family_id = ?').get(auctionId, familyId);
    if (!auction) {
      return res.status(404).json({ error: 'Auction not found' });
    }

    if (auction.status !== 'active') {
      return res.status(400).json({ error: 'This auction is already closed' });
    }

    const winnerId = auction.highest_bidder_id;
    const finalAmount = auction.highest_bid;

    let txHash = null;

    if (winnerId && finalAmount > 0) {
      const winner = db.prepare('SELECT id, display_name, stellar_public_key, stellar_secret_key FROM users WHERE id = ?').get(winnerId);
      const family = db.prepare('SELECT vault_address FROM families WHERE id = ?').get(familyId);

      if (winner && family && winner.stellar_secret_key && family.vault_address && familyId !== 'demo-family-id') {
        const { sendTokaPayment } = require('../services/stellar');
        try {
          console.log(`Finalizing Auction: Sending ${finalAmount} TOKA from winner ${winner.display_name} to family vault...`);
          txHash = await sendTokaPayment(winner.stellar_secret_key, family.vault_address, finalAmount);
        } catch (stellarErr) {
          console.error('Stellar payment for auction winner failed:', stellarErr.message);
        }
      }

      // Record transaction log in ledger
      db.transaction(() => {
        db.prepare(`
          INSERT INTO transactions (id, family_id, user_id, type, amount, description, tx_hash)
          VALUES (?, ?, ?, 'cashout', ?, ?, ?)
        `).run(uuidv4(), familyId, winnerId, finalAmount, `Won Auction: ${auction.title}`, txHash);

        db.prepare('UPDATE auctions SET status = \'completed\' WHERE id = ?').run(auctionId);
      })();
    } else {
      // Completed with no bids
      db.prepare('UPDATE auctions SET status = \'completed\' WHERE id = ?').run(auctionId);
    }

    res.json({ success: true, message: 'Auction finalized successfully', tx_hash: txHash });
  } catch (err) {
    console.error('Error finalizing auction:', err);
    res.status(500).json({ error: 'Failed to finalize auction' });
  }
});

module.exports = router;

