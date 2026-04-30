const Transaction = require('../models/Transaction');
const Course = require('../models/Course');
const Enrollment = require('../models/Enrollment');
const User = require('../models/User');

// @desc    Create Checkout Session for Course(s) Purchase
// @route   POST /api/payments/create-checkout-session
// @access  Private (Student)
const createCheckoutSession = async (req, res) => {
  const { courseId, courseIds } = req.body;
  const ids = courseIds || [courseId];

  try {
    const courses = await Course.find({ _id: { $in: ids } });
    if (courses.length === 0) return res.status(404).json({ message: 'No courses found' });

    let totalAmount = 0;
    const transactions = [];

    for (const course of courses) {
      const amount = course.price;
      totalAmount += amount;
      const mentorShare = amount * 0.8;
      const adminShare = amount * 0.2;

      const transaction = await Transaction.create({
        type: 'course',
        courseId: course._id,
        studentId: req.user._id,
        mentorId: course.mentorId,
        totalAmount: amount,
        mentorShare,
        adminShare,
      });
      transactions.push(transaction._id);
    }

    // Mocking the creation of a session
    res.json({ 
      id: `mock_sess_${Date.now()}`, 
      transactionIds: transactions, 
      courseTitles: courses.map(c => c.title),
      amount: totalAmount 
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Confirm Course Payment & Enroll Student
// @route   POST /api/payments/confirm
// @access  Private (Student)
const confirmPayment = async (req, res) => {
  const { sessionId, transactionId, transactionIds } = req.body;
  const ids = transactionIds || [transactionId];

  try {
    const confirmedTransactions = [];
    const enrollments = [];

    for (const id of ids) {
      const transaction = await Transaction.findById(id).populate('courseId');
      if (!transaction) continue;
      if (transaction.status === 'completed') continue;

      transaction.status = 'completed';
      transaction.paymentId = sessionId || `mock_pi_${Date.now()}`;
      await transaction.save();

      // Enroll student
      const enrollment = await Enrollment.create({
        studentId: transaction.studentId,
        courseId: transaction.courseId._id
      });

      confirmedTransactions.push(transaction);
      enrollments.push(enrollment);
    }

    res.json({ 
      message: 'Payment confirmed & Enrolled', 
      transactions: confirmedTransactions, 
      enrollments 
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create Checkout Session for Mentor Subscription
// @route   POST /api/payments/create-subscription-session
// @access  Private (Mentor)
const createSubscriptionSession = async (req, res) => {
  const { plan } = req.body;
  try {
    if (plan !== 'paid') {
      return res.status(400).json({ message: 'Only paid plans require checkout' });
    }

    const totalAmount = 29.00;
    const adminShare = totalAmount;

    const transaction = await Transaction.create({
      type: 'subscription',
      studentId: req.user._id,
      totalAmount,
      mentorShare: 0,
      adminShare,
    });

    res.json({ id: `mock_sess_${Date.now()}`, transactionId: transaction._id, title: 'SkillFlow Pro Subscription', amount: totalAmount });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Confirm Subscription Payment
// @route   POST /api/payments/confirm-subscription
// @access  Private (Mentor)
const confirmSubscription = async (req, res) => {
  const { sessionId, transactionId } = req.body;
  try {
    const transaction = await Transaction.findById(transactionId);
    if (!transaction) return res.status(404).json({ message: "Transaction not found" });
    if (transaction.type !== 'subscription') return res.status(400).json({ message: "Invalid transaction type" });

    transaction.status = 'completed';
    transaction.paymentId = sessionId || `mock_pi_${Date.now()}`;
    await transaction.save();

    const user = await User.findById(transaction.studentId);
    user.mentorPlan = 'paid';
    await user.save();

    res.json({ 
      message: 'Subscription confirmed & upgraded successfully', 
      transaction, 
      user: { ...user.toObject(), password: undefined } 
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { createCheckoutSession, confirmPayment, createSubscriptionSession, confirmSubscription };
