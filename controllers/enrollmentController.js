const Enrollment = require('../models/Enrollment');
const Lesson = require('../models/Lesson');

// @desc    Enroll a student in a free course
// @route   POST /api/enrollments
// @access  Private (Student)
const enrollStudent = async (req, res) => {
  const { courseId } = req.body;
  try {
    const existing = await Enrollment.findOne({ studentId: req.user._id, courseId });
    if (existing) return res.status(400).json({ message: 'Already enrolled' });

    const enrollment = await Enrollment.create({ studentId: req.user._id, courseId });
    res.status(201).json(enrollment);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get student enrollments
// @route   GET /api/enrollments/my-enrollments
// @access  Private (Student)
const getMyEnrollments = async (req, res) => {
  try {
    const enrollments = await Enrollment.find({ studentId: req.user._id }).populate('courseId');
    res.json(enrollments);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Mark lesson as completed
// @route   PUT /api/enrollments/:courseId/complete-lesson
// @access  Private (Student)
const markLessonComplete = async (req, res) => {
  const { lessonId } = req.body;
  try {
    const enrollment = await Enrollment.findOne({ studentId: req.user._id, courseId: req.params.courseId });
    if (!enrollment) return res.status(404).json({ message: 'Enrollment not found' });

    if (!enrollment.progress.map(String).includes(String(lessonId))) {
      enrollment.progress.push(lessonId);
    }

    // Auto-complete: check if all lessons in the course are done
    const totalLessons = await Lesson.countDocuments({ courseId: req.params.courseId });
    if (totalLessons > 0 && enrollment.progress.length >= totalLessons) {
      enrollment.isCompleted = true;
    }

    await enrollment.save();
    res.json(enrollment);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get certificates (completed enrollments)
// @route   GET /api/enrollments/certificates
// @access  Private (Student)
const getCertificates = async (req, res) => {
  try {
    const enrollments = await Enrollment.find({ 
      studentId: req.user._id, 
      isCompleted: true 
    }).populate('courseId', 'title category thumbnail mentorId');
    
    // Format them for the frontend
    const certificates = enrollments.map(enr => ({
      id: enr._id,
      course: enr.courseId?.title || 'Unknown Course',
      date: new Date(enr.updatedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }),
      idNum: `CERT-${enr._id.toString().substring(0, 8).toUpperCase()}`,
      courseId: enr.courseId?._id
    }));

    res.json(certificates);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { enrollStudent, getMyEnrollments, markLessonComplete, getCertificates };
