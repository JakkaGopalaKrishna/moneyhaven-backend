const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');
const sanitizeUser = require('../utils/sanitizeUser');
const bcrypt = require('bcryptjs');

// @desc    Get user profile
// @route   GET /api/users/profile
// @access  Private
const getProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);

  if (user) {
    res.json({
      success: true,
      user: sanitizeUser(user),
    });
  } else {
    res.status(404);
    throw new Error('User not found');
  }
});

// @desc    Update user profile
// @route   PUT /api/users/profile
// @access  Private
const updateProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);

  if (user) {
    user.firstName = req.body.firstName || user.firstName;
    user.lastName = req.body.lastName || user.lastName;
    
    if (req.body.openingBalance !== undefined) {
      if (Number(req.body.openingBalance) < 0) {
        res.status(400);
        throw new Error('Opening balance cannot be negative');
      }
      user.openingBalance = req.body.openingBalance;
    }

    const updatedUser = await user.save();

    res.json({
      success: true,
      user: sanitizeUser(updatedUser),
    });
  } else {
    res.status(404);
    throw new Error('User not found');
  }
});

module.exports = {
  getProfile,
  updateProfile,
};
