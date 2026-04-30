const express = require('express');
const router = express.Router();
const { protect, restrictTo, optionalAuth } = require('../middleware/authMiddleware');
const {
  getAllPublishedCourses,
  createCourse,
  getCourseDetails,
  addSection,
  updateSection,
  deleteSection,
  addLesson,
  updateLesson,
  deleteLesson,
  saveCourseContent,
  publishCourse,
  updateCourse,
  addReview,
  getCourseReviews,
  deleteCourse,
  updateCourseCurriculum
} = require('../controllers/courseController');

// Public course listing (optional auth for enrollment status)
router.get('/', optionalAuth, getAllPublishedCourses);

// Course CRUD
router.post('/', protect, restrictTo('mentor', 'admin'), createCourse);
router.get('/:id', protect, getCourseDetails);
router.get('/:id/full-details', protect, getCourseDetails); // Alias for full nested fetching
router.put('/:id/update-full', protect, restrictTo('mentor', 'admin'), updateCourseCurriculum);
router.put('/:id/publish', protect, restrictTo('mentor', 'admin'), publishCourse);
router.put('/:id', protect, restrictTo('mentor', 'admin'), updateCourse);
router.delete('/:id', protect, restrictTo('mentor', 'admin'), deleteCourse);

// Sections
router.post('/:id/sections', protect, restrictTo('mentor', 'admin'), addSection);
router.put('/:id/sections/:sectionId', protect, restrictTo('mentor', 'admin'), updateSection);
router.delete('/:id/sections/:sectionId', protect, restrictTo('mentor', 'admin'), deleteSection);

// Lessons
router.post('/:id/sections/:sectionId/lessons', protect, restrictTo('mentor', 'admin'), addLesson);
router.put('/:id/sections/:sectionId/lessons/:lessonId', protect, restrictTo('mentor', 'admin'), updateLesson);
router.delete('/:id/sections/:sectionId/lessons/:lessonId', protect, restrictTo('mentor', 'admin'), deleteLesson);

// Course Content (Notes, Assignment, Quiz, FinalTest)
router.post('/:id/content', protect, restrictTo('mentor', 'admin'), saveCourseContent);

// Reviews
router.post('/:id/reviews', protect, restrictTo('student'), addReview);
router.get('/:id/reviews', optionalAuth, getCourseReviews);

module.exports = router;
