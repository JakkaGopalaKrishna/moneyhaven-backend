const mongoose = require('mongoose');

const otpTrackerSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
  },
  count: {
    type: Number,
    default: 1,
  },
  lastRequestAt: {
    type: Date,
    default: Date.now,
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 600, // 10 minutes TTL
  },
});

const OtpTracker = mongoose.model('OtpTracker', otpTrackerSchema);

module.exports = OtpTracker;
