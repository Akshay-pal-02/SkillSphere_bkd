const express = require('express');
const router = express.Router();
const { protect, restrictTo } = require('../middleware/authMiddleware');
const { saveQuiz, getQuizzesByCourse, getQuizBySection } = require('../controllers/quizController');

router.post('/', protect, restrictTo('mentor', 'admin'), saveQuiz);
router.get('/:courseId', protect, getQuizzesByCourse);
router.get('/section/:sectionId', protect, getQuizBySection);

module.exports = router;
