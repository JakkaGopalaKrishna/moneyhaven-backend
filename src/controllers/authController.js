const User = require('../models/User');
const Otp = require('../models/Otp');
const OtpTracker = require('../models/OtpTracker');
const asyncHandler = require('../utils/asyncHandler');
const generateToken = require('../utils/generateToken');
const sanitizeUser = require('../utils/sanitizeUser');
const { sendOtpEmail } = require('../services/emailService');
const bcrypt = require('bcryptjs');

// @desc    Send OTP
// @route   POST /api/auth/send-otp
// @access  Public
const sendOtp = asyncHandler(async (req, res) => {
  const { email } = req.body;

  // Prevent Existing Users from Requesting OTP
  const userExists = await User.findOne({ email });
  if (userExists) {
    res.status(400);
    throw new Error('Account already exists. Please login.');
  }

  // Rate Limiting Logic
  let tracker = await OtpTracker.findOne({ email });
  const now = new Date();

  if (tracker) {
    // Check 60s cooldown
    const secondsSinceLast = (now - tracker.lastRequestAt) / 1000;
    if (secondsSinceLast < 60) {
      res.status(429);
      throw new Error('Please wait 60 seconds before requesting another OTP.');
    }

    // Check max 3 requests per 10 mins
    if (tracker.count >= 3) {
      res.status(429);
      throw new Error('Please wait before requesting another OTP.');
    }

    tracker.count += 1;
    tracker.lastRequestAt = now;
    await tracker.save();
  } else {
    await OtpTracker.create({ email, count: 1 });
  }

  // Generate 6-digit OTP
  const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();

  // Calculate Expiry (from ENV or default 5 mins)
  const expiryMinutes = parseInt(process.env.OTP_EXPIRY_MINUTES) || 5;
  const expiresAt = new Date(now.getTime() + expiryMinutes * 60000);

  // Remove existing OTP for this email
  await Otp.deleteMany({ email });

  // Create new OTP
  await Otp.create({
    email,
    otp: generatedOtp,
    expiresAt,
  });

  // Send Email
  await sendOtpEmail(email, generatedOtp);

  res.json({
    success: true,
    message: 'OTP sent successfully',
  });
});

// @desc    Register user
// @route   POST /api/auth/register
// @access  Public
const register = asyncHandler(async (req, res) => {
  const { firstName, lastName, email, password, openingBalance } = req.body;

  // Check if user already exists
  const userExists = await User.findOne({ email });

  if (userExists) {
    res.status(400);
    throw new Error('User already exists');
  }

  // Hash password
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);

  // Create user
  const user = await User.create({
    firstName,
    lastName,
    email,
    password: hashedPassword,
    openingBalance: openingBalance || 0,
  });

  if (user) {
    const token = generateToken(user._id);

    res.status(201).json({
      success: true,
      token,
      user: sanitizeUser(user),
    });
  } else {
    res.status(400);
    throw new Error('Invalid user data');
  }
});

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email });

  if (user && (await user.matchPassword(password))) {
    const token = generateToken(user._id);

    res.json({
      success: true,
      token,
      user: sanitizeUser(user),
    });
  } else {
    res.status(401);
    throw new Error('Invalid email or password');
  }
});

// @desc    Get current user
// @route   GET /api/auth/me
// @access  Private
const getMe = asyncHandler(async (req, res) => {
  res.json({
    success: true,
    user: sanitizeUser(req.user),
  });
});

// @desc    Logout user
// @route   POST /api/auth/logout
// @access  Public
const logout = asyncHandler(async (req, res) => {
  // Since we are not using HTTP-only cookies and only passing the token in the header,
  // logout primarily happens on the client by deleting the token.
  // We provide this endpoint to fulfill the requirement and for future server-side invalidation if needed.
  res.json({
    success: true,
    message: 'Logged out successfully',
  });
});

module.exports = {
  sendOtp,
  register,
  login,
  getMe,
  logout,
};
