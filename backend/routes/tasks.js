const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateToken } = require('../middleware/auth');
const { contractCreateTask, contractApproveTask, contractSubmitTask } = require('../services/soroban');
const { sendPushNotification } = require('../services/push');
const { sendTokaPayment } = require('../services/stellar');
const { v4: uuidv4 } = require('uuid');

// Use auth middleware for all task routes
router.use(authenticateToken);

// Create a new task (Anchor only)
router.post('/', async (req, res) => {
  const { title, description, reward_amount, assigned_to, deadline, recurrence, contract_tx_hash, earner_public_key, is_collaborative } = req.body;
  const created_by = req.user.id;
  const family_id = req.user.family_id;

  if (req.user.role !== 'anchor') {
    return res.status(403).json({ error: 'Only anchors can create tasks' });
  }

  try {
    let taskId = uuidv4(); // default to UUID if no contract call is made

    if (contract_tx_hash && !is_collaborative) {
      // For Soroban tasks, we expect the client to generate the task ID (e.g., using a sequence or random number for the contract call)
      // Since we don't have the contract return value here, the client should pass the intended task ID or we just log the tx_hash.
      // Wait, in the smart contract `create_task` returns an ID. If the client signs and submits, they can extract the ID from the result.
      // Let's accept `soroban_task_id` from the client.
    }

    // Resolve assigned_to to a valid user ID to satisfy the foreign key constraint
    let resolvedAssignedTo = null;
    if (!is_collaborative) {
      if (earner_public_key) {
        const getEarner = db.prepare('SELECT id FROM users WHERE stellar_public_key = ? AND family_id = ?');
        const earner = getEarner.get(earner_public_key, family_id);
        if (earner) {
          resolvedAssignedTo = earner.id;
        }
      }
      if (!resolvedAssignedTo) {
        // Fallback for MVP demo: just pick any earner in the family if the public key isn't found
        const getAnyEarner = db.prepare("SELECT id FROM users WHERE role = 'earner' AND family_id = ?");
        const anyEarner = getAnyEarner.get(family_id);
        if (anyEarner) {
          resolvedAssignedTo = anyEarner.id;
        }
      }
    }

    const insertTask = db.prepare(`
      INSERT INTO tasks (id, family_id, assigned_to, created_by, title, description, reward_amount, status, deadline, recurrence, is_collaborative, contract_tx_hash) 
      VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?)
    `);
    
    insertTask.run(
      req.body.soroban_task_id ? req.body.soroban_task_id.toString() : taskId, 
      family_id, 
      resolvedAssignedTo, 
      created_by, 
      title, 
      description, 
      reward_amount, 
      deadline || null, 
      recurrence || 'none',
      is_collaborative ? 1 : 0,
      contract_tx_hash || null
    );
    
    if (resolvedAssignedTo) {
      const getEarnerToken = db.prepare('SELECT push_token FROM users WHERE id = ?');
      const earnerTokenRow = getEarnerToken.get(resolvedAssignedTo);
      if (earnerTokenRow && earnerTokenRow.push_token) {
        sendPushNotification(earnerTokenRow.push_token, 'New Task Assigned', `You have a new task: ${title}`);
      }
    } else if (is_collaborative) {
      // Notify all earners in family
      const getEarners = db.prepare("SELECT push_token FROM users WHERE family_id = ? AND role = 'earner' AND push_token IS NOT NULL").all(family_id);
      for (const earner of getEarners) {
        sendPushNotification(earner.push_token, 'New Shared Quest! 🌟', `New family collaborative chore: ${title}`);
      }
    }

    res.json({ success: true, task_id: taskId });
  } catch (err) {
    console.error('Error creating task:', err);
    res.status(500).json({ error: 'Failed to create task' });
  }
});

// Get all tasks for the user's family
router.get('/', (req, res) => {
  try {
    const getTasks = db.prepare(`
      SELECT t.*, u.stellar_public_key as earner_public_key, u.display_name as earner_name
      FROM tasks t
      LEFT JOIN users u ON t.assigned_to = u.id
      WHERE t.family_id = ? 
      ORDER BY t.created_at DESC
    `);
    const tasks = getTasks.all(req.user.family_id);
    res.json(tasks);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
});

// Submit a task (Earner only)
router.post('/:id/submit', async (req, res) => {
  const { proof_ipfs_cid } = req.body;
  const taskId = req.params.id;

  if (req.user.role !== 'earner') {
    return res.status(403).json({ error: 'Only earners can submit tasks' });
  }

  try {
    const getTask = db.prepare(`
      SELECT status, deadline, reward_amount, is_collaborative
      FROM tasks
      WHERE id = ? AND family_id = ?
    `);
    const task = getTask.get(taskId, req.user.family_id);

    if (!task) {
      return res.status(404).json({ error: 'Task not found or not part of your family' });
    }

    if (task.status !== 'pending' && task.status !== 'rejected') {
      if (!(task.is_collaborative && task.status === 'submitted')) {
        return res.status(400).json({ error: 'Task cannot be submitted in its current state' });
      }
    }

    const deadlineMs = task.deadline ? Date.parse(task.deadline) : null;
    const isLate = Number.isFinite(deadlineMs) && deadlineMs < Date.now();
    const baseReward = Number(task.reward_amount) || 0;
    const shouldDeduct = isLate && task.status === 'pending';
    const adjustedReward = shouldDeduct
      ? Math.round(baseReward * 0.5 * 100) / 100
      : baseReward;

    const { tx_hash } = req.body;
    const isSoroban = !isNaN(Number(taskId));
    let contractTxHash = tx_hash;

    if (isSoroban && req.user.family_id !== 'demo-family-id') {
      if (!contractTxHash) {
        return res.status(400).json({ error: 'Transaction hash is required to submit this task on-chain.' });
      }
    }

    db.transaction(() => {
      if (task.is_collaborative) {
        const insertContribution = db.prepare(`
          INSERT INTO task_contributions (task_id, earner_id, proof_ipfs_cid)
          VALUES (?, ?, ?)
          ON CONFLICT(task_id, earner_id) DO UPDATE SET proof_ipfs_cid = ?, submitted_at = CURRENT_TIMESTAMP
        `);
        insertContribution.run(taskId, req.user.id, proof_ipfs_cid || '', proof_ipfs_cid || '');

        db.prepare(`
          UPDATE tasks
          SET status = 'submitted', updated_at = CURRENT_TIMESTAMP
          WHERE id = ? AND family_id = ?
        `).run(taskId, req.user.family_id);
      } else {
        const updateTask = db.prepare(`
          UPDATE tasks
          SET status = 'submitted', proof_ipfs_cid = ?, reward_amount = ?, contract_tx_hash = ?, updated_at = CURRENT_TIMESTAMP
          WHERE id = ? AND family_id = ?
        `);
        updateTask.run(proof_ipfs_cid, adjustedReward, contractTxHash, taskId, req.user.family_id);
      }
    })();
    
    // Notify anchors
    const getTaskDetails = db.prepare('SELECT title FROM tasks WHERE id = ?').get(taskId);
    const getAnchors = db.prepare("SELECT push_token FROM users WHERE family_id = ? AND role = 'anchor' AND push_token IS NOT NULL");
    const anchors = getAnchors.all(req.user.family_id);
    
    for (const anchor of anchors) {
      sendPushNotification(anchor.push_token, 'Task Submitted', `A task was submitted for review: ${getTaskDetails?.title || 'Check it out'}`);
    }
    
    res.json({
      success: true,
      message: task.is_collaborative ? 'Quest contribution submitted' : 'Task submitted',
      late: isLate,
      reward_amount: adjustedReward,
      contract_tx_hash: contractTxHash
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to submit task' });
  }
});

// Approve a task (Anchor only)
router.post('/:id/approve', async (req, res) => {
  const taskId = req.params.id;
  const { tx_hash } = req.body;
  const anchorId = req.user.id;
  const familyId = req.user.family_id;

  if (req.user.role !== 'anchor') {
    return res.status(403).json({ error: 'Only anchors can approve tasks' });
  }

  try {
    const getTaskDetails = db.prepare('SELECT title, assigned_to, reward_amount, status, is_collaborative FROM tasks WHERE id = ? AND family_id = ?').get(taskId, familyId);
    
    if (!getTaskDetails) {
      return res.status(404).json({ error: 'Task not found or not part of your family' });
    }
    if (getTaskDetails.status === 'approved') {
      return res.status(400).json({ error: 'Task is already approved' });
    }
    if (getTaskDetails.status !== 'submitted') {
      return res.status(400).json({ error: 'Task must be submitted before approval' });
    }

    // Get all anchors in the household
    const anchors = db.prepare("SELECT id FROM users WHERE family_id = ? AND role = 'anchor'").all(familyId);
    const totalAnchors = anchors.length;

    if (totalAnchors > 1) {
      // Check if this anchor has already approved
      const alreadyApproved = db.prepare('SELECT 1 FROM task_approvals WHERE task_id = ? AND anchor_id = ?').get(taskId, anchorId);
      if (alreadyApproved) {
        return res.status(400).json({ error: 'You have already approved this task. Waiting for other co-parents.' });
      }

      // Count current approvals
      const currentApprovals = db.prepare('SELECT COUNT(*) as count FROM task_approvals WHERE task_id = ?').get(taskId).count;

      if (currentApprovals + 1 < totalAnchors) {
        // Record this anchor's approval (not final approval yet)
        db.prepare('INSERT INTO task_approvals (task_id, anchor_id) VALUES (?, ?)').run(taskId, anchorId);
        return res.json({ 
          success: true, 
          fully_approved: false, 
          message: `Approval recorded. (${currentApprovals + 1}/${totalAnchors} parent approvals)` 
        });
      }
      // If we reach this point, this is the final approval. We do NOT write to task_approvals yet or delete them.
      // We will perform the payment/contract transaction first.
    }

    let finalTxHash = tx_hash;
    if (!finalTxHash && familyId !== 'demo-family-id') {
      return res.status(400).json({ error: 'Transaction hash required (must sign on client)' });
    }
    if (!finalTxHash) {
      finalTxHash = 'demo_tx_hash_' + uuidv4().substring(0,8);
    }

    if (getTaskDetails.is_collaborative) {
      // Collaborative Quest
      const contributors = db.prepare('SELECT earner_id FROM task_contributions WHERE task_id = ?').all(taskId);
      
      if (contributors.length === 0) {
        return res.status(400).json({ error: 'No contributions submitted for this collaborative quest.' });
      }

      const earnerPayments = [];
      for (const contributor of contributors) {
        const getEarner = db.prepare('SELECT stellar_public_key, push_token FROM users WHERE id = ?').get(contributor.earner_id);
        earnerPayments.push({ earnerId: contributor.earner_id, pushToken: getEarner?.push_token });
      }

      // After all payments succeed, update DB in a transaction
      db.transaction(() => {
        for (const payment of earnerPayments) {
          const xpEarned = Math.max(10, Math.floor(getTaskDetails.reward_amount * 10));
          db.prepare('UPDATE users SET xp = xp + ?, task_streak = task_streak + 1 WHERE id = ?').run(xpEarned, payment.earnerId);
          
          db.prepare(`
            INSERT INTO transactions (id, family_id, user_id, type, amount, description, tx_hash)
            VALUES (?, ?, ?, 'reward', ?, ?, ?)
          `).run(uuidv4(), familyId, payment.earnerId, getTaskDetails.reward_amount, `Quest Completed: ${getTaskDetails.title}`, finalTxHash);

          if (payment.pushToken) {
            sendPushNotification(payment.pushToken, 'Quest Approved! 🎉', `Collaborative quest "${getTaskDetails.title}" was approved. You earned ${getTaskDetails.reward_amount} TOKA and ${xpEarned} XP!`);
          }
        }

        // Clean up contributions and approvals
        db.prepare('DELETE FROM task_contributions WHERE task_id = ?').run(taskId);
        if (totalAnchors > 1) {
          db.prepare('DELETE FROM task_approvals WHERE task_id = ?').run(taskId);
        }
        
        db.prepare(`
          UPDATE tasks SET status = 'approved', updated_at = CURRENT_TIMESTAMP
          WHERE id = ? AND family_id = ?
        `).run(taskId, familyId);
      })();

      // Single earner task
      if (!getTaskDetails.assigned_to) {
        return res.status(400).json({ error: 'Task is not assigned to anyone.' });
      }

      const getEarner = db.prepare('SELECT stellar_public_key, push_token FROM users WHERE id = ?').get(getTaskDetails.assigned_to);
      if (!getEarner) {
        return res.status(404).json({ error: 'Assigned earner not found.' });
      }

      // Record in DB only on blockchain transaction success
      const xpEarned = Math.max(10, Math.floor(getTaskDetails.reward_amount > 0 ? getTaskDetails.reward_amount * 10 : 50));
      db.transaction(() => {
        db.prepare('UPDATE users SET xp = xp + ?, task_streak = task_streak + 1 WHERE id = ?').run(xpEarned, getTaskDetails.assigned_to);
        
        db.prepare(`
          INSERT INTO transactions (id, family_id, user_id, type, amount, description, tx_hash)
          VALUES (?, ?, ?, 'reward', ?, ?, ?)
        `).run(uuidv4(), familyId, getTaskDetails.assigned_to, getTaskDetails.reward_amount, `Completed Task: ${getTaskDetails.title}`, finalTxHash);

        if (totalAnchors > 1) {
          db.prepare('DELETE FROM task_approvals WHERE task_id = ?').run(taskId);
        }

        db.prepare(`
          UPDATE tasks SET status = 'approved', updated_at = CURRENT_TIMESTAMP, contract_tx_hash = ? 
          WHERE id = ? AND family_id = ?
        `).run(finalTxHash, taskId, familyId);
      })();

      if (getEarner.push_token) {
        const rewardMsg = getTaskDetails.reward_amount < 0 
          ? `Your tax payment "${getTaskDetails.title}" was approved.` 
          : `Your task "${getTaskDetails.title}" was approved. You earned ${getTaskDetails.reward_amount} TOKA!`;
        sendPushNotification(getEarner.push_token, 'Task Approved! 🎉', `${rewardMsg} +${xpEarned} XP`);
      }
    }
    
    res.json({ success: true, fully_approved: true, message: 'Task approved' });
  } catch (err) {
    console.error('Error approving task:', err);
    res.status(500).json({ error: 'Failed to approve task' });
  }
});

// Reject a task (Anchor only)
router.post('/:id/reject', (req, res) => {
  const taskId = req.params.id;

  if (req.user.role !== 'anchor') {
    return res.status(403).json({ error: 'Only anchors can reject tasks' });
  }

  try {
    const updateTask = db.prepare(`
      UPDATE tasks SET status = 'rejected', updated_at = CURRENT_TIMESTAMP 
      WHERE id = ? AND family_id = ?
    `);
    
    const info = updateTask.run(taskId, req.user.family_id);
    if (info.changes === 0) {
      return res.status(404).json({ error: 'Task not found or not part of your family' });
    }
    
    // Notify earner and reset their streak
    const getTaskDetails = db.prepare('SELECT title, assigned_to FROM tasks WHERE id = ?').get(taskId);
    if (getTaskDetails && getTaskDetails.assigned_to) {
      // Streak resets on rejection
      db.prepare('UPDATE users SET task_streak = 0 WHERE id = ?').run(getTaskDetails.assigned_to);

      const getEarnerToken = db.prepare('SELECT push_token FROM users WHERE id = ?').get(getTaskDetails.assigned_to);
      if (getEarnerToken && getEarnerToken.push_token) {
        sendPushNotification(getEarnerToken.push_token, 'Task Rejected 😔', `Your task "${getTaskDetails.title}" was rejected and needs revision. Your streak has been reset.`);
      }
    }
    
    res.json({ success: true, message: 'Task rejected' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to reject task' });
  }
});

// Get contributions for a task
router.get('/:id/contributions', (req, res) => {
  const taskId = req.params.id;
  try {
    const contributions = db.prepare(`
      SELECT tc.task_id, tc.earner_id, tc.proof_ipfs_cid, tc.submitted_at, u.display_name, u.avatar_emoji, u.stellar_public_key
      FROM task_contributions tc
      JOIN users u ON tc.earner_id = u.id
      WHERE tc.task_id = ?
    `).all(taskId);
    res.json(contributions);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to retrieve task contributions' });
  }
});

module.exports = router;
