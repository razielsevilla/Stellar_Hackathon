const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateToken } = require('../middleware/auth');

router.use(authenticateToken);

router.get('/me', (req, res) => {
  try {
    const getUser = db.prepare(`
      SELECT u.id, u.family_id, u.stellar_public_key, u.role, u.display_name, u.avatar_emoji, u.relationship, u.age, u.savings_goal, u.xp, u.savings_balance,
             f.family_name, f.invite_code, f.tax_flat_amount, f.tax_percentage, f.tax_frequency, f.tax_description, f.interest_rate, f.toka_exchange_rate, f.vault_address
      FROM users u
      LEFT JOIN families f ON u.family_id = f.id
      WHERE u.id = ?
    `);
    const user = getUser.get(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to retrieve user profile' });
  }
});

router.post('/profile/update', (req, res) => {
  const { display_name, age, savings_goal, relationship } = req.body;
  try {
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    const newName = display_name !== undefined ? display_name : user.display_name;
    const newAge = age !== undefined ? age : user.age;
    const newGoal = savings_goal !== undefined ? savings_goal : user.savings_goal;
    const newRel = relationship !== undefined ? relationship : user.relationship;

    db.prepare('UPDATE users SET display_name = ?, age = ?, savings_goal = ?, relationship = ? WHERE id = ?')
      .run(newName, newAge, newGoal, newRel, req.user.id);

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

router.post('/push-token', (req, res) => {
  const { push_token } = req.body;
  
  if (!push_token) {
    return res.status(400).json({ error: 'Push token is required' });
  }

  try {
    const updateToken = db.prepare('UPDATE users SET push_token = ? WHERE id = ?');
    updateToken.run(push_token, req.user.id);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update push token' });
  }
});

module.exports = router;
