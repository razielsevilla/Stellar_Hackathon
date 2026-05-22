const express = require('express');
const router  = express.Router();
const db      = require('../db');
const { authenticateToken } = require('../middleware/auth');

router.use(authenticateToken);

// ─── GET /family/members ──────────────────────────────────────────────────────
router.get('/members', (req, res) => {
  try {
    const members = db.prepare(`
      SELECT id, stellar_public_key, role, display_name, avatar_emoji, relationship, age,
             savings_goal, savings_goal_amount, xp, savings_balance, task_streak
      FROM users
      WHERE family_id = ?
      ORDER BY role ASC, display_name ASC
    `).all(req.user.family_id);
    res.json(members);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to retrieve household members' });
  }
});

// ─── GET /family/activity ─────────────────────────────────────────────────────
// Returns a unified timeline of family events (last 60), newest first.
// Each event has: id, type, actor_name, actor_emoji, title, detail, created_at
router.get('/activity', (req, res) => {
  const familyId = req.user.family_id;
  const role     = req.user.role;
  const userId   = req.user.id;

  try {
    // 1. Task-lifecycle events (earner = own tasks only, anchor = all)
    const taskFilter = role === 'earner' ? `AND (t.assigned_to = '${userId}' OR t.created_by = '${userId}')` : '';

    const taskEvents = db.prepare(`
      SELECT
        t.id              AS id,
        'task_' || t.status AS type,
        creator.display_name AS actor_name,
        creator.avatar_emoji AS actor_emoji,
        t.title           AS title,
        t.reward_amount   AS detail,
        t.updated_at      AS created_at
      FROM tasks t
      JOIN users creator ON creator.id = t.created_by
      WHERE t.family_id = ?
        ${taskFilter}
    `).all(familyId);

    // 2. Financial transaction events
    const txFilter = role === 'earner' ? `AND tx.user_id = '${userId}'` : '';

    const txEvents = db.prepare(`
      SELECT
        tx.id             AS id,
        'tx_' || tx.type  AS type,
        u.display_name    AS actor_name,
        u.avatar_emoji    AS actor_emoji,
        tx.description    AS title,
        tx.amount         AS detail,
        tx.created_at     AS created_at
      FROM transactions tx
      JOIN users u ON u.id = tx.user_id
      WHERE tx.family_id = ?
        ${txFilter}
    `).all(familyId);

    // 3. Cashout / Reward redemption events
    const cashoutFilter = role === 'earner' ? `AND c.earner_id = '${userId}'` : '';

    const cashoutEvents = db.prepare(`
      SELECT
        c.id              AS id,
        CASE WHEN c.reward_title IS NOT NULL THEN 'reward_redeemed' ELSE 'cashout_requested' END AS type,
        u.display_name    AS actor_name,
        u.avatar_emoji    AS actor_emoji,
        COALESCE(c.reward_title, 'Peso Cashout') AS title,
        c.toka_amount     AS detail,
        c.created_at      AS created_at
      FROM cashouts c
      JOIN users u ON u.id = c.earner_id
      WHERE c.family_id = ?
        ${cashoutFilter}
    `).all(familyId);

    // 4. Auction bid events (anchor sees all, earner sees own bids)
    const bidFilter = role === 'earner' ? `AND ab.user_id = '${userId}'` : '';

    const bidEvents = db.prepare(`
      SELECT
        ab.id             AS id,
        'auction_bid'     AS type,
        u.display_name    AS actor_name,
        u.avatar_emoji    AS actor_emoji,
        a.title           AS title,
        ab.amount         AS detail,
        ab.created_at     AS created_at
      FROM auction_bids ab
      JOIN users u ON u.id = ab.user_id
      JOIN auctions a ON a.id = ab.auction_id
      WHERE a.family_id = ?
        ${bidFilter}
    `).all(familyId);

    // Merge & sort newest first, cap at 60
    const all = [...taskEvents, ...txEvents, ...cashoutEvents, ...bidEvents]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 60);

    res.json(all);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to retrieve activity feed' });
  }
});

// ─── GET /family/analytics ────────────────────────────────────────────────────
// Anchor-only: aggregate stats for the family dashboard.
router.get('/analytics', (req, res) => {
  if (req.user.role !== 'anchor') {
    return res.status(403).json({ error: 'Anchor access only' });
  }

  const familyId = req.user.family_id;

  try {
    // Total TOKA rewards distributed
    const tokaRow = db.prepare(`
      SELECT COALESCE(SUM(amount), 0) AS total
      FROM transactions
      WHERE family_id = ? AND type = 'reward'
    `).get(familyId);

    // Task completion stats
    const taskStats = db.prepare(`
      SELECT
        COUNT(*) FILTER (WHERE status = 'approved') AS approved,
        COUNT(*) FILTER (WHERE status = 'rejected') AS rejected,
        COUNT(*) FILTER (WHERE status NOT IN ('approved','rejected')) AS pending,
        COUNT(*) AS total
      FROM tasks
      WHERE family_id = ?
    `).get(familyId);

    // Total XP awarded
    const xpRow = db.prepare(`
      SELECT COALESCE(SUM(xp), 0) AS total
      FROM users
      WHERE family_id = ? AND role = 'earner'
    `).get(familyId);

    // Total savings across all earners
    const savingsRow = db.prepare(`
      SELECT COALESCE(SUM(savings_balance), 0) AS total
      FROM users
      WHERE family_id = ? AND role = 'earner'
    `).get(familyId);

    // Per-earner breakdown (for bar chart)
    const perEarner = db.prepare(`
      SELECT
        display_name AS name,
        avatar_emoji AS emoji,
        xp,
        task_streak  AS streak,
        savings_balance,
        savings_goal,
        savings_goal_amount,
        (
          SELECT COALESCE(SUM(amount), 0)
          FROM transactions tx
          WHERE tx.user_id = u.id AND tx.type = 'reward'
        ) AS toka_earned
      FROM users u
      WHERE family_id = ? AND role = 'earner'
      ORDER BY toka_earned DESC
    `).all(familyId);

    // Most recent approved task
    const latestApproved = db.prepare(`
      SELECT t.title, u.display_name AS earner_name
      FROM tasks t
      JOIN users u ON u.id = t.assigned_to
      WHERE t.family_id = ? AND t.status = 'approved'
      ORDER BY t.updated_at DESC
      LIMIT 1
    `).get(familyId);

    const completionRate = taskStats.total > 0
      ? Math.round((taskStats.approved / taskStats.total) * 100)
      : 0;

    res.json({
      total_toka_distributed: tokaRow.total,
      tasks_approved:   taskStats.approved,
      tasks_total:      taskStats.total,
      tasks_pending:    taskStats.pending,
      completion_rate:  completionRate,
      total_xp_awarded: xpRow.total,
      total_savings:    savingsRow.total,
      latest_approved:  latestApproved || null,
      per_earner:       perEarner,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to retrieve analytics' });
  }
});

module.exports = router;
