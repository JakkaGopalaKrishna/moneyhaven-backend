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

const fs = require('fs');
const path = require('path');

// @desc    Upload user avatar
// @route   POST /api/users/avatar
// @access  Private
const uploadAvatar = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);

  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  if (!req.file) {
    res.status(400);
    throw new Error('Please upload an image file');
  }

  // Delete old avatar if it exists
  if (user.avatar) {
    const oldAvatarPath = path.join(__dirname, '../../', user.avatar);
    if (fs.existsSync(oldAvatarPath)) {
      fs.unlinkSync(oldAvatarPath);
    }
  }

  // Update user with new avatar URL
  const avatarUrl = `/uploads/avatars/${req.file.filename}`;
  user.avatar = avatarUrl;
  const updatedUser = await user.save();

  res.json({
    success: true,
    message: 'Avatar uploaded successfully',
    user: sanitizeUser(updatedUser),
  });
});

// @desc    Delete user avatar
// @route   DELETE /api/users/avatar
// @access  Private
const deleteAvatar = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);

  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  if (user.avatar) {
    const oldAvatarPath = path.join(__dirname, '../../', user.avatar);
    if (fs.existsSync(oldAvatarPath)) {
      fs.unlinkSync(oldAvatarPath);
    }
    user.avatar = '';
    const updatedUser = await user.save();

    res.json({
      success: true,
      message: 'Avatar deleted successfully',
      user: sanitizeUser(updatedUser),
    });
  } else {
    res.status(400);
    throw new Error('No avatar to delete');
  }
});

module.exports = {
  getProfile,
  updateProfile,
  uploadAvatar,
  deleteAvatar,
};
