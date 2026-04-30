const express = require('express');
const router = express.Router();
const { 
  getAdminStats, 
  getPendingMentors, 
  verifyMentor, 
  getAllCourses, 
  getAllUsers,
  getAdminTransactions,
  getAdminRevenueSummary,
  createAdminCourse,
  updateAdminCourse,
  deleteAdminCourse,
  publishUnpublishCourse,
  deleteUser
} = require('../controllers/adminController');
const { protect, restrictTo } = require('../middleware/authMiddleware');

// All routes require user to be logged in and have 'admin' role
router.use(protect);
router.use(restrictTo('admin'));

router.get('/stats', getAdminStats);
router.get('/mentors/pending', getPendingMentors);
router.put('/mentors/:id/verify', verifyMentor);
router.get('/courses', getAllCourses);
router.post('/courses', createAdminCourse);
router.put('/courses/:id', updateAdminCourse);
router.delete('/courses/:id', deleteAdminCourse);
router.put('/courses/:id/status', publishUnpublishCourse);

router.get('/users', getAllUsers);
router.delete('/users/:id', deleteUser);
router.get('/transactions', getAdminTransactions);
router.get('/revenue-summary', getAdminRevenueSummary);

module.exports = router;

