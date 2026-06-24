const express = require('express');
const { register, login, getMe, logout } = require('../controllers/authController');
const { registerValidation, loginValidation } = require('../validations/authValidation');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/register', registerValidation, register);
router.post('/login', loginValidation, login);
router.get('/me', protect, getMe);
router.post('/logout', logout);

module.exports = router;
