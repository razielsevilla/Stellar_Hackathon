const cron = require('node-cron');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const crypto = require('./crypto');

function startCron() {
  console.log('[CRON] Starting recurrence task scheduler...');

  // Run every minute
  cron.schedule('* * * * *', () => {
    try {
      const tasks = db.prepare("SELECT * FROM tasks WHERE recurrence IS NOT NULL AND recurrence != 'none'").all();
      
      const now = new Date();
      const todayStr = now.toISOString().split('T')[0]; // YYYY-MM-DD
      const currentHour = now.getHours();
      const currentDayOfWeek = now.getDay(); // 0 is Sunday
      const currentDate = now.getDate(); // 1-31

      for (const task of tasks) {
        let rec;
        try {
          rec = JSON.parse(task.recurrence);
        } catch (e) {
          continue;
        }

        if (!rec || rec.type === 'none') continue;

        let shouldGenerate = false;

        // Daily: midnight
        if (rec.type === 'daily') {
          if (currentHour === 0 && rec.last_generated !== todayStr) {
            shouldGenerate = true;
          }
        }
        // Weekly: Sunday midnight
        else if (rec.type === 'weekly') {
          // Sunday is 0
          if (currentDayOfWeek === 0 && currentHour === 0 && rec.last_generated !== todayStr) {
            shouldGenerate = true;
          }
        }
        // Monthly: 1st of the month midnight
        else if (rec.type === 'monthly') {
          if (currentDate === 1 && currentHour === 0 && rec.last_generated !== todayStr) {
            shouldGenerate = true;
          }
        }
        // Regularly: 1 hour before the deadline time
        else if (rec.type === 'regular') {
          // rec.time is comma separated like "08:00, 14:00, 20:00"
          if (rec.time) {
            const times = rec.time.split(',').map(t => t.trim());
            for (const t of times) {
              const [hourStr, minStr] = t.split(':');
              if (hourStr && minStr) {
                let targetHour = parseInt(hourStr, 10) - 1; // 1 hour before
                if (targetHour < 0) targetHour = 23; 

                const targetIdentifier = `${todayStr}-${targetHour}`;
                
                // If it's the target hour, and we haven't generated for this specific target hour today
                if (currentHour === targetHour && rec.last_generated !== targetIdentifier) {
                  shouldGenerate = true;
                  rec.last_generated = targetIdentifier; // we update it to this specific hour marker
                  break; 
                }
              }
            }
          }
        }

        if (shouldGenerate) {
          if (rec.type !== 'regular') {
            rec.last_generated = todayStr;
          }

          // Create new task (instance)
          const newTaskId = uuidv4();
          
          // The new task has NO recurrence so it doesn't spawn its own children, it's just a normal task
          const insertStmt = db.prepare(`
            INSERT INTO tasks (id, family_id, assigned_to, created_by, title, description, reward_amount, status, recurrence)
            VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', 'none')
          `);
          insertStmt.run(newTaskId, task.family_id, task.assigned_to, task.created_by, task.title, task.description, task.reward_amount);

          // Update master task's last_generated to prevent duplication
          db.prepare(`UPDATE tasks SET recurrence = ? WHERE id = ?`).run(JSON.stringify(rec), task.id);
          
          console.log(`[CRON] Generated new recurring task: ${task.title}`);
        }
      }
    } catch (err) {
      console.error('[CRON] Error running recurring tasks check:', err);
    }
  });
  // Daily savings interest compounding cron (every midnight)
  cron.schedule('0 0 * * *', async () => {
    try {
      console.log('[CRON] Starting daily savings interest compound execution...');
      const earnersWithSavings = db.prepare('SELECT id, family_id, savings_balance FROM users WHERE role = "earner" AND savings_balance > 0').all();
      for (const earner of earnersWithSavings) {
        const family = db.prepare('SELECT interest_rate FROM families WHERE id = ?').get(earner.family_id);
        if (family && family.interest_rate > 0) {
          const interestAmount = earner.savings_balance * family.interest_rate;
          const roundedInterest = Math.round(interestAmount * 100) / 100;
          if (roundedInterest > 0) {
            db.transaction(() => {
              db.prepare('UPDATE users SET savings_balance = savings_balance + ? WHERE id = ?').run(roundedInterest, earner.id);
              db.prepare(`
                INSERT INTO transactions (id, family_id, user_id, type, amount, description)
                VALUES (?, ?, ?, 'interest', ?, 'Savings Interest Compound')
              `).run(uuidv4(), earner.family_id, earner.id, roundedInterest);
            })();
            console.log(`[CRON] Compounded interest of ${roundedInterest} TOKA for earner ${earner.id}`);
          }
        }
      }
    } catch (err) {
      console.error('[CRON] Error compounding savings interest:', err);
    }

    // Daily tax automated collection (every midnight)
    try {
      console.log('[CRON] Starting daily household tax deduction execution...');
      const earners = db.prepare('SELECT id, family_id, display_name, stellar_secret_key FROM users WHERE role = "earner"').all();
      for (const earner of earners) {
        const family = db.prepare('SELECT tax_flat_amount, tax_percentage, tax_frequency, tax_description, vault_address FROM families WHERE id = ?').get(earner.family_id);
        if (family && family.tax_frequency === 'daily' && family.tax_flat_amount > 0) {
          const taxAmount = family.tax_flat_amount;
          
          let txHash = null;
          if (earner.stellar_secret_key && earner.family_id !== 'demo-family-id') {
            try {
              const { sendTokaPayment } = require('./stellar');
              txHash = await sendTokaPayment(earner.stellar_secret_key, family.vault_address, taxAmount);
            } catch (stellarErr) {
              console.error(`[CRON] Daily tax collection transaction failed for ${earner.display_name}:`, stellarErr.message);
            }
          }

          db.transaction(() => {
            db.prepare(`
              INSERT INTO transactions (id, family_id, user_id, type, amount, description, tx_hash)
              VALUES (?, ?, ?, 'tax', ?, ?, ?)
            `).run(uuidv4(), earner.family_id, earner.id, taxAmount, family.tax_description || 'Automated Daily Household Tax Deduction', txHash);
          })();
          console.log(`[CRON] Deducted daily tax of ${taxAmount} TOKA from earner ${earner.id}`);
        }
      }
    } catch (err) {
      console.error('[CRON] Error collecting daily household taxes:', err);
    }
  });

  // Weekly tax automated collection cron (every Sunday midnight)
  cron.schedule('0 0 * * 0', async () => {
    try {
      console.log('[CRON] Starting weekly household tax deduction execution...');
      const earners = db.prepare('SELECT id, family_id, display_name, stellar_secret_key FROM users WHERE role = "earner"').all();
      for (const earner of earners) {
        const family = db.prepare('SELECT tax_flat_amount, tax_percentage, tax_frequency, tax_description, vault_address FROM families WHERE id = ?').get(earner.family_id);
        if (family && family.tax_frequency === 'weekly' && family.tax_flat_amount > 0) {
          const taxAmount = family.tax_flat_amount;
          
          let txHash = null;
          if (earner.stellar_secret_key && earner.family_id !== 'demo-family-id') {
            try {
              const { sendTokaPayment } = require('./stellar');
              txHash = await sendTokaPayment(earner.stellar_secret_key, family.vault_address, taxAmount);
            } catch (stellarErr) {
              console.error(`[CRON] Weekly tax collection transaction failed for ${earner.display_name}:`, stellarErr.message);
            }
          }

          db.transaction(() => {
            db.prepare(`
              INSERT INTO transactions (id, family_id, user_id, type, amount, description, tx_hash)
              VALUES (?, ?, ?, 'tax', ?, ?, ?)
            `).run(uuidv4(), earner.family_id, earner.id, taxAmount, family.tax_description || 'Automated Weekly Household Tax Deduction', txHash);
          })();
          console.log(`[CRON] Deducted weekly tax of ${taxAmount} TOKA from earner ${earner.id}`);
        }
      }
    } catch (err) {
      console.error('[CRON] Error collecting weekly household taxes:', err);
    }
  });
}

module.exports = { startCron };
