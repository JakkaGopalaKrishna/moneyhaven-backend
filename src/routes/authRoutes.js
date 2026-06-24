const express = require('express');
const { register, login, getMe, logout, sendOtp } = require('../controllers/authController');
const { registerValidation, loginValidation, sendOtpValidation } = require('../validations/authValidation');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/send-otp', sendOtpValidation, sendOtp);
router.post('/register', registerValidation, register);
router.post('/login', loginValidation, login);
router.get('/me', protect, getMe);
router.post('/logout', logout);

module.exports = router;
