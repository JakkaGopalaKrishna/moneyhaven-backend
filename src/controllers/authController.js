const User = require('../models/User');
const Otp = require('../models/Otp');
const OtpTracker = require('../models/OtpTracker');
const Category = require('../models/Category');
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

// @desc    Verify OTP
// @route   POST /api/auth/verify-otp
// @access  Public
const verifyOtp = asyncHandler(async (req, res) => {
  const { email, otp } = req.body;

  const otpRecord = await Otp.findOne({ email });

  if (!otpRecord) {
    res.status(400);
    throw new Error('OTP not found or expired. Please request a new one.');
  }

  // Check attempts
  if (otpRecord.attempts >= 5) {
    await Otp.deleteMany({ email });
    res.status(400);
    throw new Error('Too many failed attempts. OTP invalidated. Please request a new one.');
  }

  // Increment attempts
  otpRecord.attempts += 1;

  // Verify OTP
  const isMatch = await otpRecord.matchOtp(otp);

  if (!isMatch) {
    await otpRecord.save();
    res.status(400);
    throw new Error('Invalid OTP');
  }

  // Success
  otpRecord.isVerified = true;
  await otpRecord.save();

  res.json({
    success: true,
    message: 'OTP verified successfully',
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

  // Check if OTP is verified
  // BYPASS OTP FOR NOW
  /*
  const otpRecord = await Otp.findOne({ email, isVerified: true });
  
  if (!otpRecord) {
    res.status(400);
    throw new Error('Email not verified. Please verify your email first.');
  }
  */

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
    isVerified: true, // User is verified at registration
  });

  if (user) {
    // Seed default categories
    const defaultCategories = [
      { name: 'Salary', type: 'income', icon: 'BankOutlined', color: '#3f8600', isDefault: true, userId: user._id },
      { name: 'Freelance', type: 'income', icon: 'LaptopOutlined', color: '#13c2c2', isDefault: true, userId: user._id },
      { name: 'Investment', type: 'income', icon: 'LineChartOutlined', color: '#722ed1', isDefault: true, userId: user._id },
      { name: 'Business', type: 'income', icon: 'ShopOutlined', color: '#1677ff', isDefault: true, userId: user._id },
      { name: 'Other', type: 'income', icon: 'AppstoreOutlined', color: '#8c8c8c', isDefault: true, userId: user._id },

      { name: 'Food', type: 'expense', icon: 'CoffeeOutlined', color: '#fa8c16', isDefault: true, userId: user._id },
      { name: 'Travel', type: 'expense', icon: 'CarOutlined', color: '#eb2f96', isDefault: true, userId: user._id },
      { name: 'Bills', type: 'expense', icon: 'FileTextOutlined', color: '#1677ff', isDefault: true, userId: user._id },
      { name: 'Shopping', type: 'expense', icon: 'ShoppingOutlined', color: '#f5222d', isDefault: true, userId: user._id },
      { name: 'Healthcare', type: 'expense', icon: 'MedicineBoxOutlined', color: '#f5222d', isDefault: true, userId: user._id },
      { name: 'Entertainment', type: 'expense', icon: 'PlaySquareOutlined', color: '#faad14', isDefault: true, userId: user._id },
      { name: 'Education', type: 'expense', icon: 'BookOutlined', color: '#2f54eb', isDefault: true, userId: user._id },
      { name: 'Other', type: 'expense', icon: 'AppstoreOutlined', color: '#8c8c8c', isDefault: true, userId: user._id },
    ];
    await Category.insertMany(defaultCategories);

    // Delete OTP record after successful registration
    await Otp.deleteMany({ email });

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
    user.lastLogin = new Date();
    await user.save();

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
  verifyOtp,
  register,
  login,
  getMe,
  logout,
};
