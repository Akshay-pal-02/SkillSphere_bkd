const express = require('express');
const router = express.Router();
const { generateContent } = require('../controllers/aiController');
const { protect, restrictTo } = require('../middleware/authMiddleware');

router.post('/generate', protect, restrictTo('mentor', 'admin'), generateContent);

module.exports = router;
