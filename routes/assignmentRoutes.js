const express = require('express');
const router = express.Router();
const { protect, restrictTo } = require('../middleware/authMiddleware');
const { uploadSubmission } = require('../middleware/upload');
const { getMyAssignments, submitAssignment } = require('../controllers/assignmentController');

router.route('/my')
  .get(protect, restrictTo('student'), getMyAssignments);

router.route('/:id/submit')
  .post(protect, restrictTo('student'), uploadSubmission.single('pdfFile'), submitAssignment);

module.exports = router;
