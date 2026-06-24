const mongoose = require('mongoose');

const reportScheduleSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    reportType: {
      type: String,
      required: true,
      enum: ['Monthly', 'Yearly', 'Executive Summary', 'Financial Health', 'Goals'],
    },
    frequency: {
      type: String,
      required: true,
      enum: ['Weekly', 'Monthly', 'Quarterly', 'Yearly'],
    },
    format: {
      type: String,
      required: true,
      enum: ['PDF', 'CSV', 'Excel'],
    },
    email: {
      type: String, // fallback for email delivery (future)
      default: null,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    lastRunAt: {
      type: Date,
      default: null,
    },
    nextRunAt: {
      type: Date,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

const ReportSchedule = mongoose.model('ReportSchedule', reportScheduleSchema);

module.exports = ReportSchedule;
