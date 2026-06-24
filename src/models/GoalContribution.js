const mongoose = require('mongoose');

const goalContributionSchema = new mongoose.Schema(
  {
    goalId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SavingsGoal',
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    amount: {
      type: Number,
      required: true,
      min: [0.01, 'Contribution amount must be greater than zero'],
    },
    note: {
      type: String,
      trim: true,
      maxlength: 250,
    },
    contributionDate: {
      type: Date,
      default: Date.now,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

const GoalContribution = mongoose.model('GoalContribution', goalContributionSchema);

module.exports = GoalContribution;
