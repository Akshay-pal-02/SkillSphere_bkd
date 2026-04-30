const User = require('../models/User');

// @desc    Get top mentors for landing page
// @route   GET /api/public/mentors
// @access  Public
const getTopMentors = async (req, res) => {
  try {
    // Find mentors, sorted by totalStudents or rating
    const mentors = await User.find({ role: 'mentor' })
      .select('name avatar mentorDetails role')
      .sort({ 'mentorDetails.totalStudents': -1, 'mentorDetails.rating': -1 })
      .limit(4);
      
    res.json(mentors);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getTopMentors };
