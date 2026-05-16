const express = require('express');
const router = express.Router();

router.get('/', (req, res) => res.send('Get Tasks'));
router.post('/', (req, res) => res.send('Create Task'));

module.exports = router;
