const mongoose = require('mongoose');

const financialHealthHistorySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    score: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
    breakdown: {
      savingsRateScore: Number,
      budgetComplianceScore: Number,
      goalAchievementScore: Number,
      expenseControlScore: Number,
    },
    snapshotDate: {
      type: Date,
      default: Date.now,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Index for easy monthly charting
financialHealthHistorySchema.index({ userId: 1, snapshotDate: -1 });

const FinancialHealthHistory = mongoose.model('FinancialHealthHistory', financialHealthHistorySchema);

module.exports = FinancialHealthHistory;
