const Assignment = require('../models/Assignment');
const Enrollment = require('../models/Enrollment');
const AssignmentSubmission = require('../models/AssignmentSubmission');
const cloudinary = require('../config/cloudinary');

// @desc    Get assignments for enrolled courses
// @route   GET /api/assignments/my
// @access  Private (Student)
const getMyAssignments = async (req, res) => {
  try {
    // 1. Get user enrollments
    const enrollments = await Enrollment.find({ studentId: req.user._id }).populate('courseId', 'title');
    const courseIds = enrollments.map(e => e.courseId._id);

    // 2. Get all assignments from these courses
    const assignments = await Assignment.find({
      courseId: { $in: courseIds }
    }).populate('courseId', 'title');

    // 3. Get student submissions
    const submissions = await AssignmentSubmission.find({ studentId: req.user._id });
    const submissionMap = {};
    submissions.forEach(sub => {
      submissionMap[sub.assignmentId.toString()] = sub;
    });

    // 4. Merge and format
    const formatted = assignments.map(a => {
      const sub = submissionMap[a._id.toString()];
      // Some courses might have placeholder titles if populate isn't deep enough, but we have it.
      return {
        id: a._id,
        title: `Assignment: ${a.courseId?.title || 'Course'}`,
        course: a.courseId?.title || 'Unknown Course',
        description: a.body || 'Please complete this assignment.',
        dueDate: a.deadline ? new Date(a.deadline).toLocaleDateString() : 'Flexible',
        status: sub ? sub.status : 'pending',
        grade: sub ? sub.grade : undefined,
        fileUrl: sub ? sub.fileUrl : undefined,
        assignmentFileUrl: a.fileUrl || undefined
      };
    });

    res.json(formatted);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Submit an assignment (PDF upload via Multer)
// @route   POST /api/assignments/:id/submit
// @access  Private (Student)
const submitAssignment = async (req, res) => {
  try {
    const assignmentId = req.params.id;
    const assignment = await Assignment.findById(assignmentId);
    if (!assignment) {
      return res.status(404).json({ message: 'Assignment not found' });
    }

    // Verify enrollment
    const enrollment = await Enrollment.findOne({ studentId: req.user._id, courseId: assignment.courseId });
    if (!enrollment) {
      return res.status(403).json({ message: 'Not enrolled in this course' });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'PDF file is required' });
    }

    // Cloudinary: req.file.path = secure CDN URL, req.file.filename = public_id
    const fileUrl      = req.file.path;      // full Cloudinary HTTPS URL
    const filePublicId = req.file.filename;  // public_id for future deletion

    const submission = await AssignmentSubmission.findOneAndUpdate(
      { studentId: req.user._id, assignmentId },
      { courseId: assignment.courseId, fileUrl, filePublicId, status: 'submitted', submittedAt: new Date() },
      { new: true, upsert: true }
    );

    res.status(200).json({ message: 'Assignment uploaded successfully', submission });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getMyAssignments, submitAssignment };
