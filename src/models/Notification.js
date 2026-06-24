const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      required: true,
      enum: ['Budget Alert', 'Goal Alert', 'Goal Completed', 'Report Generated', 'Financial Health Alert', 'System Notification'],
    },
    severity: {
      type: String,
      enum: ['Info', 'Warning', 'Critical', 'Success'],
      default: 'Info',
    },
    priority: {
      type: String,
      enum: ['Low', 'Medium', 'High', 'Critical'],
      default: 'Medium',
    },
    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },
    readAt: {
      type: Date,
      default: null,
    },
    isArchived: {
      type: Boolean,
      default: false,
      index: true,
    },
    relatedEntityType: {
      type: String,
      enum: ['Budget', 'Goal', 'Report', 'Transaction', 'System', null],
      default: null,
    },
    relatedEntityId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    actionUrl: {
      type: String,
      default: null,
    },
    expiresAt: {
      type: Date,
      default: null,
      index: { expireAfterSeconds: 0 } // TTL index if we ever want auto-delete
    },
  },
  {
    timestamps: true,
  }
);

const Notification = mongoose.model('Notification', notificationSchema);

module.exports = Notification;
