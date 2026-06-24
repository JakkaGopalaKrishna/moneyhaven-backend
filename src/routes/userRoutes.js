const express = require('express');
const { getProfile, updateProfile, uploadAvatar, deleteAvatar, changePassword } = require('../controllers/userController');
const { protect } = require('../middleware/authMiddleware');
const { upload } = require('../config/multer');

const router = express.Router();

router.route('/profile')
  .get(protect, getProfile)
  .put(protect, updateProfile);

router.route('/change-password')
  .put(protect, changePassword);

router.route('/avatar')
  .post(protect, upload.single('avatar'), uploadAvatar)
  .delete(protect, deleteAvatar);

module.exports = router;
