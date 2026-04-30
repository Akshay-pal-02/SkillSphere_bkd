const express = require('express');
const router = express.Router();
const { registerUser, loginUser, logoutUser, getUserProfile, submitMentorVerification, selectMentorPlan, updateUserProfile, changePassword, resetPassword } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');
const { uploadAvatar } = require('../middleware/upload');

router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/logout', logoutUser);
router.post('/reset-password', resetPassword);
router.get('/me', protect, getUserProfile);

// Mentor-specific routes
router.post('/verify-mentor', protect, submitMentorVerification);
router.post('/mentor-plan', protect, selectMentorPlan);

// Profile update
router.put('/update-profile', protect, uploadAvatar.single('avatar'), updateUserProfile);
router.put('/change-password', protect, changePassword);


module.exports = router;
