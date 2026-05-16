const express = require('express');
const router = express.Router();

router.post('/register', (req, res) => res.send('Register'));
router.post('/join', (req, res) => res.send('Join'));

module.exports = router;
