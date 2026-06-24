const express = require('express');
const router = express.Router();
const {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  archiveNotification,
  getPreferences,
  updatePreferences
} = require('../controllers/notificationController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.get('/preferences', getPreferences);
router.put('/preferences', updatePreferences);

router.get('/unread-count', getUnreadCount);
router.patch('/read-all', markAllAsRead);

router.route('/')
  .get(getNotifications);

router.route('/:id')
  .delete(archiveNotification);

router.patch('/:id/read', markAsRead);

module.exports = router;
