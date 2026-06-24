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
const { cloudinary } = require('../config/multer');

const getCloudinaryPublicId = (url) => {
  if (!url || !url.includes('cloudinary.com')) return null;
  const parts = url.split('/');
  const filePart = parts[parts.length - 1];
  const folderPart = parts[parts.length - 2];
  const rootFolderPart = parts[parts.length - 3];
  
  if (rootFolderPart === 'moneyhaven' && folderPart === 'avatars') {
    const filenameWithoutExt = filePart.split('.')[0];
    return `moneyhaven/avatars/${filenameWithoutExt}`;
  }
  return null;
};

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
    const publicId = getCloudinaryPublicId(user.avatar);
    if (publicId) {
      await cloudinary.uploader.destroy(publicId);
    } else {
      const oldAvatarPath = path.join(__dirname, '../../', user.avatar);
      if (fs.existsSync(oldAvatarPath)) {
        fs.unlinkSync(oldAvatarPath);
      }
    }
  }

  // Update user with new avatar URL
  const avatarUrl = req.file.path; // Cloudinary URL
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
    const publicId = getCloudinaryPublicId(user.avatar);
    if (publicId) {
      await cloudinary.uploader.destroy(publicId);
    } else {
      const oldAvatarPath = path.join(__dirname, '../../', user.avatar);
      if (fs.existsSync(oldAvatarPath)) {
        fs.unlinkSync(oldAvatarPath);
      }
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

// @desc    Change user password
// @route   PUT /api/users/change-password
// @access  Private
const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  const user = await User.findById(req.user._id);

  if (user && (await user.matchPassword(currentPassword))) {
    // Validate strong password
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d\w\W]{8,}$/;
    if (!passwordRegex.test(newPassword)) {
      res.status(400);
      throw new Error('Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, and one number');
    }

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    
    await user.save();

    res.json({
      success: true,
      message: 'Password changed successfully',
    });
  } else {
    res.status(401);
    throw new Error('Invalid current password');
  }
});

module.exports = {
  getProfile,
  updateProfile,
  uploadAvatar,
  deleteAvatar,
  changePassword,
};
