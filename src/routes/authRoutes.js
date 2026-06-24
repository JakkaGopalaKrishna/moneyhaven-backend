const express = require('express');
const { register, login, getMe, logout, sendOtp, verifyOtp } = require('../controllers/authController');
const { registerValidation, loginValidation, sendOtpValidation, verifyOtpValidation } = require('../validations/authValidation');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/send-otp', sendOtpValidation, sendOtp);
router.post('/verify-otp', verifyOtpValidation, verifyOtp);
router.post('/register', registerValidation, register);
router.post('/login', loginValidation, login);
router.get('/me', protect, getMe);
router.post('/logout', logout);

module.exports = router;
