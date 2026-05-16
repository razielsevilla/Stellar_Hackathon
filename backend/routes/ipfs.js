const express = require('express');
const router = express.Router();

router.post('/upload', (req, res) => res.send('Upload IPFS'));

module.exports = router;
