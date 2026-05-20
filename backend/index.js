const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// Seed Demo Accounts if needed
const seedDemoAccounts = require('./db/seedDemo');
seedDemoAccounts();

// Start Cron Jobs
const { startCron } = require('./services/cron');
startCron();

// Routes
app.use('/auth', require('./routes/auth'));
app.use('/tasks', require('./routes/tasks'));
app.use('/ipfs', require('./routes/ipfs'));
app.use('/family', require('./routes/family'));
app.use('/users', require('./routes/users'));
app.use('/marketplace', require('./routes/marketplace'));
app.use('/wallet', require('./routes/wallet'));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', network: process.env.STELLAR_NETWORK });
});

const PORT = process.env.PORT || 3333;
app.listen(PORT, () => {
  console.log(`Toka API running on port ${PORT}`);
});
