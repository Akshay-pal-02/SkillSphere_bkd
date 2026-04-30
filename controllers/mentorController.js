const Transaction = require('../models/Transaction');
const Course = require('../models/Course');
const Enrollment = require('../models/Enrollment');

// Helper: group transactions by day (last N days)
const buildDailyRevenue = (transactions, days) => {
  const now = new Date();
  const result = {};

  // Initialize all days to 0
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const key = d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
    result[key] = { date: key, revenue: 0, enrollments: 0 };
  }

  const cutoff = new Date(now);
  cutoff.setDate(cutoff.getDate() - days);

  transactions.forEach(t => {
    const txDate = new Date(t.createdAt);
    if (txDate >= cutoff) {
      const key = txDate.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
      if (result[key]) {
        result[key].revenue += t.mentorShare || 0;
        result[key].enrollments += 1;
      }
    }
  });

  return Object.values(result);
};

// Helper: sum revenue within a calendar month
const revenueInMonth = (transactions, year, month) => {
  return transactions
    .filter(t => {
      const d = new Date(t.createdAt);
      return d.getFullYear() === year && d.getMonth() === month;
    })
    .reduce((sum, t) => sum + (t.mentorShare || 0), 0);
};

// @desc    Get mentor dashboard stats
// @route   GET /api/mentor/stats
// @access  Private (Mentor)
const getMentorStats = async (req, res) => {
  try {
    const mentorId = req.user._id;

    // 1. All completed course transactions for this mentor
    const transactions = await Transaction.find({ mentorId, status: 'completed', type: 'course' })
      .sort({ createdAt: -1 })
      .populate('studentId', 'name email avatar')
      .populate('courseId', 'title');

    // 2. Revenue calculations
    const grossSales      = transactions.reduce((sum, t) => sum + (t.totalAmount || 0), 0);
    const totalRevenue    = transactions.reduce((sum, t) => sum + (t.mentorShare || 0), 0); // 80%
    const platformFee     = transactions.reduce((sum, t) => sum + (t.adminShare || 0), 0);  // 20%
    const totalTransactions = transactions.length;

    // 3. Weekly revenue (last 7 days) for sparkline
    const weeklyRevenue = buildDailyRevenue(transactions, 7);

    // 4. Monthly revenue comparison
    const now = new Date();
    const thisMonthRevenue = revenueInMonth(transactions, now.getFullYear(), now.getMonth());
    const lastMonthRevenue = revenueInMonth(
      transactions,
      now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear(),
      now.getMonth() === 0 ? 11 : now.getMonth() - 1
    );
    const revenueGrowth = lastMonthRevenue === 0
      ? (thisMonthRevenue > 0 ? 100 : 0)
      : (((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100);

    // 5. Active Courses
    const activeCourses = await Course.countDocuments({ mentorId, status: 'published' });

    // 6. All mentor's courses (any status) — for courses page
    const mentorCourses = await Course.find({ mentorId }).sort({ createdAt: -1 });
    const courseIds = mentorCourses.map(c => c._id);

    // 7. Total unique students (from Enrollment, includes free)
    const totalStudentsArr = await Enrollment.distinct('studentId', { courseId: { $in: courseIds } });
    const totalStudents = totalStudentsArr.length;

    // 8. Student growth (this month vs last month enrollments)
    const allEnrollments = await Enrollment.find({ courseId: { $in: courseIds } }).sort({ createdAt: -1 });
    const thisMonthStudents = allEnrollments.filter(e => {
      const d = new Date(e.createdAt);
      return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
    }).length;
    const lastMonthStudents = allEnrollments.filter(e => {
      const d = new Date(e.createdAt);
      const lm = now.getMonth() === 0 ? 11 : now.getMonth() - 1;
      const ly = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
      return d.getFullYear() === ly && d.getMonth() === lm;
    }).length;
    const studentGrowth = lastMonthStudents === 0
      ? (thisMonthStudents > 0 ? 100 : 0)
      : (((thisMonthStudents - lastMonthStudents) / lastMonthStudents) * 100);

    // 9. Course growth
    const thisMonthCourses = mentorCourses.filter(c => {
      const d = new Date(c.createdAt);
      return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
    }).length;

    // 10. Recent 8 enrollments for dashboard table (combine transactions + free enrollments)
    const recentTransactionIds = transactions.slice(0, 8).map(t => t._id.toString());
    const recentEnrollments = transactions.slice(0, 8).map(t => ({
      _id: t._id,
      studentName: t.studentId?.name || 'Unknown',
      studentAvatar: t.studentId?.avatar || null,
      courseTitle: t.courseId?.title || 'Unknown',
      date: t.createdAt,
      amountEarned: t.mentorShare || 0,
      type: 'paid',
    }));

    // Also grab recent free enrollments not in transactions
    const recentFreeEnrollments = await Enrollment.find({
      courseId: { $in: courseIds },
    })
      .sort({ createdAt: -1 })
      .limit(20)
      .populate('studentId', 'name email avatar')
      .populate('courseId', 'title price');

    const freeEnrollments = recentFreeEnrollments
      .filter(e => !e.courseId?.price || e.courseId.price === 0)
      .slice(0, 4)
      .map(e => ({
        _id: e._id,
        studentName: e.studentId?.name || 'Unknown',
        studentAvatar: e.studentId?.avatar || null,
        courseTitle: e.courseId?.title || 'Unknown',
        date: e.createdAt,
        amountEarned: 0,
        type: 'free',
      }));

    const combinedEnrollments = [...recentEnrollments, ...freeEnrollments]
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 8);

    // 11. Notifications (system events)
    const notifications = [];
    if (recentEnrollments.length > 0) {
      notifications.push({
        id: 'n1',
        type: 'enrollment',
        message: `${recentEnrollments[0].studentName} enrolled in "${recentEnrollments[0].courseTitle}"`,
        time: recentEnrollments[0].date,
        read: false,
      });
    }
    const draftCourses = mentorCourses.filter(c => c.status === 'draft');
    if (draftCourses.length > 0) {
      notifications.push({
        id: 'n2',
        type: 'reminder',
        message: `You have ${draftCourses.length} draft course(s) not yet published`,
        time: new Date(),
        read: false,
      });
    }
    if (thisMonthRevenue > lastMonthRevenue && lastMonthRevenue > 0) {
      notifications.push({
        id: 'n3',
        type: 'revenue',
        message: `Revenue is up ${revenueGrowth.toFixed(1)}% compared to last month! 🎉`,
        time: new Date(),
        read: true,
      });
    }

    // 12. Activity timeline
    const activityTimeline = [
      ...transactions.slice(0, 5).map(t => ({
        id: t._id,
        type: 'payment',
        message: `${t.studentId?.name || 'A student'} purchased "${t.courseId?.title || 'your course'}"`,
        amount: t.mentorShare,
        time: t.createdAt,
      })),
      ...mentorCourses.slice(0, 3).map(c => ({
        id: c._id,
        type: c.status === 'published' ? 'published' : 'draft',
        message: `Course "${c.title}" ${c.status === 'published' ? 'is live' : 'saved as draft'}`,
        amount: null,
        time: c.createdAt,
      })),
    ].sort((a, b) => new Date(b.time) - new Date(a.time)).slice(0, 7);

    // 13. Full transaction splits for Revenue Analytics page
    const revenueTransactions = transactions.map(t => ({
      _id: t._id,
      courseTitle: t.courseId?.title || 'Unknown Course',
      studentName: t.studentId?.name || 'Unknown',
      pricePaid: t.totalAmount || 0,
      mentorCut: t.mentorShare || 0,
      adminCut: t.adminShare || 0,
      status: t.status,
      date: t.createdAt,
    }));

    res.json({
      // Dashboard stats
      totalRevenue,
      activeCourses,
      totalStudents,
      recentEnrollments: combinedEnrollments,
      myCourses: mentorCourses,
      notifications,
      activityTimeline,
      // Growth indicators
      revenueGrowth: parseFloat(revenueGrowth.toFixed(1)),
      studentGrowth: parseFloat(studentGrowth.toFixed(1)),
      thisMonthCourses,
      thisMonthRevenue,
      lastMonthRevenue,
      weeklyRevenue,
      // Revenue analytics
      grossSales,
      platformFee,
      totalTransactions,
      revenueTransactions,
    });
  } catch (error) {
    console.error('getMentorStats error:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get mentor's courses only (lightweight)
// @route   GET /api/mentor/courses
// @access  Private (Mentor)
const getMentorCourses = async (req, res) => {
  try {
    const mentorId = req.user._id;
    const courses = await Course.find({ mentorId }).sort({ createdAt: -1 });
    const activeCourses = courses.filter(c => c.status === 'published').length;
    res.json({ courses, activeCourses });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getMentorStats, getMentorCourses };
