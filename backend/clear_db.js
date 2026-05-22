const db = require('./db/index');
try {
  const familyId = 'demo-family-id';
  db.prepare("DELETE FROM tasks WHERE family_id = ?").run(familyId);
  db.prepare("DELETE FROM task_approvals").run();
  db.prepare("DELETE FROM task_contributions").run();
  db.prepare("DELETE FROM shop_rewards WHERE family_id = ?").run(familyId);
  db.prepare("DELETE FROM cashouts WHERE family_id = ?").run(familyId);
  db.prepare("DELETE FROM transactions WHERE family_id = ?").run(familyId);
  db.prepare("DELETE FROM auctions WHERE family_id = ?").run(familyId);
  db.prepare("DELETE FROM auction_bids").run();
  db.prepare("UPDATE users SET xp = 0, savings_balance = 0, task_streak = 0 WHERE family_id = ?").run(familyId);
  console.log('Demo history cleared successfully!');
} catch(e) {
  console.error(e);
}
