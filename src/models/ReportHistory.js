const mongoose = require('mongoose');

const reportHistorySchema = new mongoose.Schema(
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
      enum: ['Monthly', 'Yearly', 'Transactions', 'Budgets', 'Goals', 'Analytics', 'Executive Summary', 'Financial Health'],
    },
    format: {
      type: String,
      required: true,
      enum: ['PDF', 'CSV', 'Excel', 'Preview'],
    },
    filters: {
      startDate: Date,
      endDate: Date,
      month: Number,
      year: Number,
      categoryId: mongoose.Schema.Types.ObjectId,
      type: String,
    },
    fileName: {
      type: String,
      required: true,
    },
    generatedAt: {
      type: Date,
      default: Date.now,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Index to quickly fetch user's report history
reportHistorySchema.index({ userId: 1, generatedAt: -1 });

const ReportHistory = mongoose.model('ReportHistory', reportHistorySchema);

module.exports = ReportHistory;
