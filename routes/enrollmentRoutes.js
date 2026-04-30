const express = require('express');
const router = express.Router();
const { enrollStudent, getMyEnrollments, markLessonComplete, getCertificates } = require('../controllers/enrollmentController');
const { protect, restrictTo } = require('../middleware/authMiddleware');

router.route('/')
  .post(protect, restrictTo('student'), enrollStudent);

router.route('/my-enrollments')
  .get(protect, restrictTo('student'), getMyEnrollments);

// alias used by student profile
router.route('/my')
  .get(protect, restrictTo('student'), getMyEnrollments);

// certificates
router.route('/certificates')
  .get(protect, restrictTo('student'), getCertificates);

router.route('/:courseId/complete-lesson')
  .put(protect, restrictTo('student'), markLessonComplete);

module.exports = router;
