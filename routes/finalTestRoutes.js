const express = require('express');
const router = express.Router();
const { protect, restrictTo } = require('../middleware/authMiddleware');
const { saveFinalTest, getFinalTestByCourse } = require('../controllers/finalTestController');

router.post('/', protect, restrictTo('mentor', 'admin'), saveFinalTest);
router.get('/:courseId', protect, getFinalTestByCourse);

module.exports = router;
