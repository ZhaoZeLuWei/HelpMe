const express = require('express');
const router = express.Router();
const { join } = require('node:path');


router.get('/', (req, res) => {
  res.sendFile(join(__dirname, '..', 'test.html'));
});

module.exports = router;
