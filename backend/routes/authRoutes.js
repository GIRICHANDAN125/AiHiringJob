const router = require('express').Router();
const {
	register,
	login,
	verifyOTP,
	refreshToken,
	logout,
	resendOTP,
	getProfile,
	updateProfile,
} = require('../controllers/authController');
const { authenticate } = require('../middleware/authMiddleware');

router.post('/register', register);
router.post('/login', login);
router.post('/verify-otp', verifyOTP);
router.post('/resend-otp', resendOTP);
router.post('/refresh', refreshToken);
router.post('/logout', authenticate, logout);
router.get('/me', authenticate, getProfile);
router.put('/update-profile', authenticate, updateProfile);

module.exports = router;
