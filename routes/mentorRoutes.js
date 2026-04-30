const express = require('express');
const router = express.Router();
const { getMentorStats, getMentorCourses } = require('../controllers/mentorController');
const { protect, restrictTo } = require('../middleware/authMiddleware');

router.get('/stats', protect, restrictTo('mentor', 'admin'), getMentorStats);
router.get('/courses', protect, restrictTo('mentor', 'admin'), getMentorCourses);

module.exports = router;
