const User = require('../models/User');
const Course = require('../models/Course');
const Transaction = require('../models/Transaction');
const Enrollment = require('../models/Enrollment');
const MentorOnboard = require('../models/MentorOnboard');
const Section = require('../models/Section');
const Lesson = require('../models/Lesson');
const CourseContent = require('../models/CourseContent');

// @desc    Get God Mode admin stats
// @route   GET /api/admin/stats
// @access  Private (Admin)
const getAdminStats = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalStudents = await User.countDocuments({ role: 'student' });
    const totalMentors = await User.countDocuments({ role: 'mentor' });
    const totalCourses = await Course.countDocuments();
    
    // Revenue calculations (all completed transactions) - with populated refs
    const transactions = await Transaction.find({ status: 'completed' })
      .populate('courseId', 'title thumbnail category')
      .populate('studentId', 'name email avatar')
      .populate('mentorId', 'name email avatar')
      .sort({ createdAt: -1 });
    
    let courseRevenue = 0;
    let subscriptionRevenue = 0;
    let totalCirculation = 0;

    transactions.forEach(t => {
      totalCirculation += (t.totalAmount || 0);
      if (t.type === 'subscription') {
        subscriptionRevenue += (t.adminShare || 0);
      } else {
        courseRevenue += (t.adminShare || 0);
      }
    });

    const platformRevenue = courseRevenue + subscriptionRevenue;

    // Pending Verifications count
    const pendingVerificationsCount = await MentorOnboard.countDocuments({ status: 'pending' });

    // Recent Activity (new courses published)
    const recentCourses = await Course.find({ status: 'published' })
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('mentorId', 'name email');

    res.json({
      totalUsers,
      totalStudents,
      totalMentors,
      totalCourses,
      platformRevenue,
      courseRevenue,
      subscriptionRevenue,
      totalCirculation,
      pendingVerificationsCount,
      recentCourses,
      transactions
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all pending mentor verifications
// @route   GET /api/admin/mentors/pending
// @access  Private (Admin)
const getPendingMentors = async (req, res) => {
  try {
    const pendingRequests = await MentorOnboard.find({ status: 'pending' })
      .populate('user', 'name email createdAt')
      .sort({ createdAt: 1 });
      
    res.json(pendingRequests);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Approve or reject a mentor application
// @route   PUT /api/admin/mentors/:id/verify
// @access  Private (Admin)
const verifyMentor = async (req, res) => {
  try {
    const { action } = req.body; // 'approve' or 'reject'
    const status = action === 'approve' ? 'approved' : 'rejected';
    
    const application = await MentorOnboard.findById(req.params.id);
    if (!application) {
      return res.status(404).json({ message: 'Application not found' });
    }

    application.status = status;
    await application.save();

    // Sync with the User model
    const user = await User.findById(application.user);
    if (user) {
      user.verificationStatus = action === 'approve' ? 'verified' : 'rejected';
      await user.save();
    }

    res.json({ message: `Mentor application ${status} successfully.`, application });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all courses across the platform
// @route   GET /api/admin/courses
// @access  Private (Admin)
const getAllCourses = async (req, res) => {
  try {
    const courses = await Course.find()
      .populate('mentorId', 'name email')
      .sort({ createdAt: -1 });
    res.json(courses);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all system users
// @route   GET /api/admin/users
// @access  Private (Admin)
const getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select('-password').sort({ createdAt: -1 });
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete a user
// @route   DELETE /api/admin/users/:id
// @access  Private (Admin)
const deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    
    // Security: prevent admins from being deleted via this route to prevent lockouts
    if (user.role === 'admin') {
      return res.status(403).json({ message: 'Cannot delete administrator accounts' });
    }

    // Cascade delete related records
    await Enrollment.deleteMany({ studentId: user._id });
    await MentorOnboard.deleteMany({ user: user._id });
    
    // For a mentor, optionally delete courses (commented out for safety in portfolio, but could be added)
    // if (user.role === 'mentor') {
    //   await Course.deleteMany({ mentorId: user._id });
    // }

    await User.findByIdAndDelete(user._id);
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all transactions for admin revenue page
// @route   GET /api/admin/transactions
// @access  Private (Admin)
const getAdminTransactions = async (req, res) => {
  try {
    const transactions = await Transaction.find()
      .populate('courseId', 'title thumbnail category')
      .populate('studentId', 'name email avatar')
      .populate('mentorId', 'name email avatar')
      .sort({ createdAt: -1 });
    res.json(transactions);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get revenue summary with daily breakdown for charts
// @route   GET /api/admin/revenue-summary
// @access  Private (Admin)
const getAdminRevenueSummary = async (req, res) => {
  try {
    const transactions = await Transaction.find({ status: 'completed' })
      .populate('mentorId', 'name email avatar')
      .populate('courseId', 'title')
      .sort({ createdAt: -1 });

    // Overall stats
    let totalRevenue = 0, totalAdminShare = 0, totalMentorShare = 0;
    let courseRevenue = 0, subscriptionRevenue = 0;
    const mentorMap = {};
    const dailyMap = {};
    const monthlyMap = {};

    transactions.forEach(t => {
      totalRevenue += t.totalAmount || 0;
      totalAdminShare += t.adminShare || 0;
      totalMentorShare += t.mentorShare || 0;

      if (t.type === 'subscription') {
        subscriptionRevenue += t.totalAmount || 0;
      } else {
        courseRevenue += t.totalAmount || 0;
      }

      // Daily breakdown
      const day = new Date(t.createdAt).toISOString().slice(0, 10);
      if (!dailyMap[day]) dailyMap[day] = { date: day, revenue: 0, adminShare: 0, count: 0 };
      dailyMap[day].revenue += t.totalAmount || 0;
      dailyMap[day].adminShare += t.adminShare || 0;
      dailyMap[day].count += 1;

      // Monthly breakdown
      const month = new Date(t.createdAt).toISOString().slice(0, 7);
      if (!monthlyMap[month]) monthlyMap[month] = { month, revenue: 0, adminShare: 0, count: 0 };
      monthlyMap[month].revenue += t.totalAmount || 0;
      monthlyMap[month].adminShare += t.adminShare || 0;
      monthlyMap[month].count += 1;

      // Mentor earnings aggregation
      const mentorId = t.mentorId?._id?.toString();
      if (mentorId) {
        if (!mentorMap[mentorId]) {
          mentorMap[mentorId] = {
            mentorId,
            name: t.mentorId?.name || 'Unknown',
            email: t.mentorId?.email || '',
            avatar: t.mentorId?.avatar || '',
            totalEarned: 0,
            adminShare: 0,
            transactions: 0,
          };
        }
        mentorMap[mentorId].totalEarned += t.mentorShare || 0;
        mentorMap[mentorId].adminShare += t.adminShare || 0;
        mentorMap[mentorId].transactions += 1;
      }
    });

    const dailyBreakdown = Object.values(dailyMap).sort((a, b) => a.date.localeCompare(b.date));
    const monthlyBreakdown = Object.values(monthlyMap).sort((a, b) => a.month.localeCompare(b.month));
    const topMentors = Object.values(mentorMap).sort((a, b) => b.totalEarned - a.totalEarned).slice(0, 10);

    res.json({
      totalRevenue,
      totalAdminShare,
      totalMentorShare,
      courseRevenue,
      subscriptionRevenue,
      totalTransactions: transactions.length,
      dailyBreakdown,
      monthlyBreakdown,
      topMentors,
      recentTransactions: transactions.slice(0, 20),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Admin create course
// @route   POST /api/admin/courses
// @access  Private (Admin)
const createAdminCourse = async (req, res) => {
  try {
    const { title, description, price, category, thumbnail, mentorId, status } = req.body;
    
    const course = await Course.create({
      title,
      description,
      price: price || 0,
      category,
      thumbnail,
      mentorId: mentorId || req.user._id, // Default to admin if no mentor specified
      status: status || 'draft',
      type: (price && price > 0) ? 'paid' : 'free'
    });
    
    // Populate mentor info before returning
    await course.populate('mentorId', 'name email');
    res.status(201).json(course);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Admin update course
// @route   PUT /api/admin/courses/:id
// @access  Private (Admin)
const updateAdminCourse = async (req, res) => {
  try {
    const course = await Course.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true }
    ).populate('mentorId', 'name email');
    
    if (!course) return res.status(404).json({ message: 'Course not found' });
    res.json(course);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Admin delete course (cascade delete)
// @route   DELETE /api/admin/courses/:id
// @access  Private (Admin)
const deleteAdminCourse = async (req, res) => {
  try {
    console.log("Admin requesting to delete course:", req.params.id);
    const course = await Course.findById(req.params.id);
    if (!course) {
      console.log("Course not found in DB!");
      return res.status(404).json({ message: 'Course not found' });
    }

    // Cascade delete across related collections
    await Section.deleteMany({ courseId: course._id });
    await Lesson.deleteMany({ courseId: course._id });
    await CourseContent.deleteMany({ courseId: course._id });
    
    await Course.findByIdAndDelete(course._id);
    res.json({ message: 'Course successfully deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Admin publish/unpublish course
// @route   PUT /api/admin/courses/:id/status
// @access  Private (Admin)
const publishUnpublishCourse = async (req, res) => {
  try {
    const { status } = req.body;
    const course = await Course.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    ).populate('mentorId', 'name email');
    
    if (!course) return res.status(404).json({ message: 'Course not found' });
    res.json(course);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getAdminStats,
  getPendingMentors,
  verifyMentor,
  getAllCourses,
  getAllUsers,
  deleteUser,
  getAdminTransactions,
  getAdminRevenueSummary,
  createAdminCourse,
  updateAdminCourse,
  deleteAdminCourse,
  publishUnpublishCourse
};
