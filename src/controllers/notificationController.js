const asyncHandler = require('../utils/asyncHandler');
const Notification = require('../models/Notification');
const NotificationPreference = require('../models/NotificationPreference');

// @desc    Get all notifications (supports filtering)
// @route   GET /api/notifications
const getNotifications = asyncHandler(async (req, res) => {
  const { filter } = req.query; // all, unread, warning, critical, success
  
  const query = { userId: req.user._id, isArchived: false };

  if (filter === 'unread') query.isRead = false;
  else if (['warning', 'critical', 'success'].includes(filter?.toLowerCase())) {
    query.severity = filter.charAt(0).toUpperCase() + filter.slice(1);
  }

  // Handle grouping on the frontend or backend. Here we return list sorted by priority & date
  const priorityMap = { 'Critical': 4, 'High': 3, 'Medium': 2, 'Low': 1 };

  const notifications = await Notification.find(query).sort({ createdAt: -1 });

  // Custom sort for priority if needed, but chronological is usually best for feed
  // If we wanted to sort by priority:
  // notifications.sort((a, b) => priorityMap[b.priority] - priorityMap[a.priority] || b.createdAt - a.createdAt);

  res.json({ success: true, data: notifications });
});

// @desc    Get unread count
// @route   GET /api/notifications/unread-count
const getUnreadCount = asyncHandler(async (req, res) => {
  const count = await Notification.countDocuments({ userId: req.user._id, isRead: false, isArchived: false });
  res.json({ success: true, count });
});

// @desc    Mark notification as read
// @route   PATCH /api/notifications/:id/read
const markAsRead = asyncHandler(async (req, res) => {
  const notification = await Notification.findOneAndUpdate(
    { _id: req.params.id, userId: req.user._id },
    { isRead: true, readAt: new Date() },
    { new: true }
  );

  if (!notification) {
    res.status(404);
    throw new Error('Notification not found');
  }

  res.json({ success: true, data: notification });
});

// @desc    Mark all as read
// @route   PATCH /api/notifications/read-all
const markAllAsRead = asyncHandler(async (req, res) => {
  await Notification.updateMany(
    { userId: req.user._id, isRead: false, isArchived: false },
    { isRead: true, readAt: new Date() }
  );
  res.json({ success: true, message: 'All notifications marked as read' });
});

// @desc    Archive notification
// @route   DELETE /api/notifications/:id
const archiveNotification = asyncHandler(async (req, res) => {
  const notification = await Notification.findOneAndUpdate(
    { _id: req.params.id, userId: req.user._id },
    { isArchived: true },
    { new: true }
  );

  if (!notification) {
    res.status(404);
    throw new Error('Notification not found');
  }

  res.json({ success: true, message: 'Notification archived' });
});

// @desc    Get preferences
// @route   GET /api/notifications/preferences
const getPreferences = asyncHandler(async (req, res) => {
  let prefs = await NotificationPreference.findOne({ userId: req.user._id });
  if (!prefs) prefs = await NotificationPreference.create({ userId: req.user._id });
  res.json({ success: true, data: prefs });
});

// @desc    Update preferences
// @route   PUT /api/notifications/preferences
const updatePreferences = asyncHandler(async (req, res) => {
  const prefs = await NotificationPreference.findOneAndUpdate(
    { userId: req.user._id },
    req.body,
    { new: true, upsert: true }
  );
  res.json({ success: true, data: prefs });
});

module.exports = {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  archiveNotification,
  getPreferences,
  updatePreferences
};
