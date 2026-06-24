const express = require('express');
const { register } = require('../controllers/authController');
const { registerValidation } = require('../validations/authValidation');

const router = express.Router();

router.post('/register', registerValidation, register);

module.exports = router;
