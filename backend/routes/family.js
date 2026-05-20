const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateToken } = require('../middleware/auth');

router.use(authenticateToken);

// Get all members of the household (including anchors and earners)
router.get('/members', (req, res) => {
  try {
    const getMembers = db.prepare(`
      SELECT id, stellar_public_key, role, display_name, avatar_emoji, relationship, age, savings_goal, xp, savings_balance
      FROM users
      WHERE family_id = ?
      ORDER BY role ASC, display_name ASC
    `);
    const members = getMembers.all(req.user.family_id);
    res.json(members);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to retrieve household members' });
  }
});

module.exports = router;
