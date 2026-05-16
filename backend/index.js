const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// Routes
app.use('/auth', require('./routes/auth'));
app.use('/tasks', require('./routes/tasks'));
app.use('/ipfs', require('./routes/ipfs'));
app.use('/family', require('./routes/family'));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', network: process.env.STELLAR_NETWORK });
});

app.listen(process.env.PORT || 3000, () => {
  console.log(`Toka API running on port ${process.env.PORT || 3000}`);
});
