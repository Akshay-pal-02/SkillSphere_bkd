const express = require('express');
const router = express.Router();
const { 
    createCheckoutSession, 
    confirmPayment, 
    createSubscriptionSession, 
    confirmSubscription 
} = require('../controllers/paymentController');
const { protect, restrictTo } = require('../middleware/authMiddleware');

// Student endpoints -> Buy Courses
router.post('/create-checkout-session', protect, restrictTo('student'), createCheckoutSession);
router.post('/confirm', protect, restrictTo('student'), confirmPayment);

// Mentor endpoints -> Buy Subscriptions
router.post('/create-subscription-session', protect, restrictTo('mentor'), createSubscriptionSession);
router.post('/confirm-subscription', protect, restrictTo('mentor'), confirmSubscription);

module.exports = router;
