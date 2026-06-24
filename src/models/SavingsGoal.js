const mongoose = require('mongoose');

const savingsGoalSchema = new mongoose.Schema(
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
      maxlength: 100,
    },
    targetAmount: {
      type: Number,
      required: true,
      min: [1, 'Target amount must be greater than zero'],
    },
    savedAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    targetDate: {
      type: Date,
      required: true,
      validate: {
        validator: function (v) {
          return v > new Date();
        },
        message: 'Target date must be in the future',
      },
    },
    category: {
      type: String,
      enum: ['Emergency', 'Travel', 'Education', 'Vehicle', 'Home', 'Investment', 'Other'],
      default: 'Other',
    },
    priority: {
      type: String,
      enum: ['Low', 'Medium', 'High'],
      default: 'Medium',
    },
    status: {
      type: String,
      enum: ['Active', 'Completed', 'Cancelled'],
      default: 'Active',
    },
    notes: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    isArchived: {
      type: Boolean,
      default: false,
    },
    completedAt: {
      type: Date,
    },
    lastReminderSent: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

const SavingsGoal = mongoose.model('SavingsGoal', savingsGoalSchema);

module.exports = SavingsGoal;
