const mongoose = require('mongoose');

const reportExecutionLogSchema = new mongoose.Schema(
  {
    scheduleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ReportSchedule',
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['Success', 'Failed'],
      required: true,
    },
    executedAt: {
      type: Date,
      default: Date.now,
    },
    errorMessage: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: false, // executedAt acts as createdAt
  }
);

const ReportExecutionLog = mongoose.model('ReportExecutionLog', reportExecutionLogSchema);

module.exports = ReportExecutionLog;
