const mongoose = require('mongoose');

const notificationPreferenceSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    budgetAlerts: {
      type: Boolean,
      default: true,
    },
    goalAlerts: {
      type: Boolean,
      default: true,
    },
    reportNotifications: {
      type: Boolean,
      default: true,
    },
    financialHealthAlerts: {
      type: Boolean,
      default: true,
    },
    emailNotifications: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

const NotificationPreference = mongoose.model('NotificationPreference', notificationPreferenceSchema);

module.exports = NotificationPreference;
