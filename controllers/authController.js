const User = require('../models/User');
const MentorOnboard = require('../models/MentorOnboard');
const generateToken = require('../utils/generateToken');

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
const registerUser = async (req, res) => {
  const { name, email, password, role } = req.body;
  try {
    const userExists = await User.findOne({ email });
    if (userExists) return res.status(400).json({ message: 'User already exists' });

    const user = await User.create({ name, email, password, role });
    if (user) {
      generateToken(res, user._id);
      res.status(201).json({ 
        _id: user._id, 
        name: user.name, 
        email: user.email, 
        role: user.role,
        verificationStatus: user.verificationStatus,
        mentorPlan: user.mentorPlan
      });
    } else {
      res.status(400).json({ message: 'Invalid user data' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Auth user & get token
// @route   POST /api/auth/login
// @access  Public
const loginUser = async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (user && (await user.matchPassword(password))) {
      generateToken(res, user._id);
      res.json({ 
        _id: user._id, 
        name: user.name, 
        email: user.email, 
        role: user.role,
        verificationStatus: user.verificationStatus,
        mentorPlan: user.mentorPlan
      });
    } else {
      res.status(401).json({ message: 'Invalid email or password' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Logout user / clear cookie
// @route   POST /api/auth/logout
// @access  Private
const logoutUser = (req, res) => {
  res.cookie('jwt', '', { 
    httpOnly: true, 
    expires: new Date(0),
    secure: process.env.NODE_ENV !== 'development',
    sameSite: process.env.NODE_ENV === 'development' ? 'lax' : 'none',
  });
  res.status(200).json({ message: 'Logged out successfully' });
};

// @desc    Get user profile
// @route   GET /api/auth/me
// @access  Private
const getUserProfile = async (req, res) => {
  const user = await User.findById(req.user._id);
  if (user) {
    res.json({ 
      _id: user._id, 
      name: user.name, 
      email: user.email, 
      role: user.role,
      verificationStatus: user.verificationStatus,
      mentorPlan: user.mentorPlan
    });
  } else {
    res.status(404).json({ message: 'User not found' });
  }
};

// @desc    Submit 5-step mentor verification form
// @route   POST /api/auth/verify-mentor
// @access  Private
const submitMentorVerification = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Save to the dedicate mentorOnboard collection
    await MentorOnboard.findOneAndUpdate(
      { user: user._id },
      { ...req.body, status: 'pending' },
      { upsert: true, new: true }
    );

    user.verificationStatus = 'pending';
    await user.save();
    
    res.json({ 
      message: 'Verification submitted', 
      user: { 
        ...user.toObject(), 
        password: undefined 
      } 
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Select a mentor plan (Free/Paid)
// @route   POST /api/auth/mentor-plan
// @access  Private
const selectMentorPlan = async (req, res) => {
  try {
    const { plan } = req.body;
    if (!['free', 'paid'].includes(plan)) {
      return res.status(400).json({ message: 'Invalid plan selected' });
    }

    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (user.verificationStatus !== 'verified') {
      return res.status(403).json({ message: 'Must be a verified mentor to select a plan' });
    }

    user.mentorPlan = plan;
    await user.save();
    
    res.json({ 
      message: `Successfully subscribed to ${plan} plan`, 
      user: { 
        ...user.toObject(), 
        password: undefined 
      } 
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update user profile (name, bio, avatar)
// @route   PUT /api/auth/update-profile
// @access  Private
const updateUserProfile = async (req, res) => {
  try {
    const { name, bio } = req.body;
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (name) user.name = name;
    if (bio !== undefined) user.mentorDetails = { ...user.mentorDetails?.toObject?.() ?? {}, bio };
    
    // Check for uploaded file — req.file.path is the Cloudinary CDN URL
    if (req.file) {
      user.avatar = req.file.path;
    } else if (req.body.avatar !== undefined) {
      user.avatar = req.body.avatar;
    }

    await user.save();

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      avatar: user.avatar,
      bio: user.mentorDetails?.bio || '',
      verificationStatus: user.verificationStatus,
      mentorPlan: user.mentorPlan,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Change user password
// @route   PUT /api/auth/change-password
// @access  Private
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Both current and new password are required' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'New password must be at least 6 characters' });
    }

    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const isMatch = await user.matchPassword(currentPassword);
    if (!isMatch) return res.status(401).json({ message: 'Current password is incorrect' });

    user.password = newPassword;
    await user.save();

    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
// @desc    Directly reset password (no email verification for portfolio purposes)
// @route   POST /api/auth/reset-password
// @access  Public
const resetPassword = async (req, res) => {
  try {
    const { email, newPassword } = req.body;
    if (!email || !newPassword) {
      return res.status(400).json({ message: 'Email and new password are required' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'New password must be at least 6 characters' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'No account found with that email' });
    }

    user.password = newPassword;
    await user.save();

    res.json({ message: 'Password has been successfully reset. You can now login.' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { registerUser, loginUser, logoutUser, getUserProfile, submitMentorVerification, selectMentorPlan, updateUserProfile, changePassword, resetPassword };
