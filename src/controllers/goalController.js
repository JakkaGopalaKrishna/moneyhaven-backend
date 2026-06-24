const SavingsGoal = require('../models/SavingsGoal');
const GoalContribution = require('../models/GoalContribution');
const asyncHandler = require('../utils/asyncHandler');
const mongoose = require('mongoose');

// @desc    Create new savings goal
// @route   POST /api/goals
// @access  Private
const createGoal = asyncHandler(async (req, res) => {
  const { title, targetAmount, targetDate, category, priority, notes } = req.body;

  if (!title || !targetAmount || !targetDate) {
    res.status(400);
    throw new Error('Please provide title, targetAmount, and targetDate');
  }

  if (new Date(targetDate) <= new Date()) {
    res.status(400);
    throw new Error('Target date must be in the future');
  }

  const goal = await SavingsGoal.create({
    userId: req.user._id,
    title,
    targetAmount,
    targetDate,
    category,
    priority,
    notes,
  });

  res.status(201).json({
    success: true,
    data: goal,
  });
});

// @desc    Get all active goals
// @route   GET /api/goals
// @access  Private
const getGoals = asyncHandler(async (req, res) => {
  const goals = await SavingsGoal.find({ userId: req.user._id, isArchived: false })
    .sort({ targetDate: 1 });

  res.json({
    success: true,
    count: goals.length,
    data: goals,
  });
});

// @desc    Get goal by ID (includes contributions)
// @route   GET /api/goals/:id
// @access  Private
const getGoalById = asyncHandler(async (req, res) => {
  const goal = await SavingsGoal.findOne({ _id: req.params.id, userId: req.user._id, isArchived: false });

  if (!goal) {
    res.status(404);
    throw new Error('Goal not found');
  }

  // Fetch contributions
  const contributions = await GoalContribution.find({ goalId: goal._id })
    .sort({ contributionDate: -1 });

  res.json({
    success: true,
    data: {
      ...goal.toObject(),
      contributions,
    },
  });
});

// @desc    Update goal
// @route   PUT /api/goals/:id
// @access  Private
const updateGoal = asyncHandler(async (req, res) => {
  const goal = await SavingsGoal.findOne({ _id: req.params.id, userId: req.user._id, isArchived: false });

  if (!goal) {
    res.status(404);
    throw new Error('Goal not found');
  }

  if (goal.status === 'Completed') {
    res.status(400);
    throw new Error('Cannot update a completed goal');
  }

  const { title, targetAmount, targetDate, category, priority, notes } = req.body;

  if (targetAmount !== undefined) {
    if (targetAmount < goal.savedAmount) {
      res.status(400);
      throw new Error('Target amount cannot be less than already saved amount');
    }
    goal.targetAmount = targetAmount;
  }

  if (title !== undefined) goal.title = title;
  if (targetDate !== undefined) {
    if (new Date(targetDate) <= new Date()) {
      res.status(400);
      throw new Error('Target date must be in the future');
    }
    goal.targetDate = targetDate;
  }
  if (category !== undefined) goal.category = category;
  if (priority !== undefined) goal.priority = priority;
  if (notes !== undefined) goal.notes = notes;

  await goal.save();

  res.json({
    success: true,
    data: goal,
  });
});

// @desc    Delete goal (Soft Delete)
// @route   DELETE /api/goals/:id
// @access  Private
const deleteGoal = asyncHandler(async (req, res) => {
  const goal = await SavingsGoal.findOne({ _id: req.params.id, userId: req.user._id, isArchived: false });

  if (!goal) {
    res.status(404);
    throw new Error('Goal not found');
  }

  goal.isArchived = true;
  await goal.save();

  res.json({
    success: true,
    message: 'Goal deleted successfully',
  });
});

// @desc    Add contribution to a goal
// @route   POST /api/goals/:id/contributions
// @access  Private
const addContribution = asyncHandler(async (req, res) => {
  const { amount, note, contributionDate } = req.body;

  const goal = await SavingsGoal.findOne({ _id: req.params.id, userId: req.user._id });

  if (!goal) {
    res.status(404);
    throw new Error('Goal not found');
  }

  if (goal.status === 'Completed' || goal.isArchived) {
    res.status(400);
    throw new Error('Cannot add contribution to a completed or archived goal');
  }

  const remaining = goal.targetAmount - goal.savedAmount;
  if (amount > remaining) {
    res.status(400);
    throw new Error(`Contribution amount (₹${amount}) exceeds remaining target (₹${remaining})`);
  }

  const contribution = await GoalContribution.create({
    goalId: goal._id,
    userId: req.user._id,
    amount,
    note,
    contributionDate: contributionDate || new Date()
  });

  goal.savedAmount += amount;
  
  if (goal.savedAmount >= goal.targetAmount) {
    goal.status = 'Completed';
    goal.completedAt = new Date();
  }

  await goal.save();

  res.status(201).json({
    success: true,
    message: goal.status === 'Completed' ? 'Goal Completed! Congratulations!' : 'Savings added successfully',
    data: {
      goal,
      contribution
    }
  });
});

// @desc    Get goal progress and calculations
// @route   GET /api/goals/progress
// @access  Private
const getGoalProgress = asyncHandler(async (req, res) => {
  const goals = await SavingsGoal.find({ userId: req.user._id, isArchived: false });

  const now = new Date();

  const progressData = goals.map(goal => {
    const progressPercentage = (goal.savedAmount / goal.targetAmount) * 100;
    const remainingAmount = goal.targetAmount - goal.savedAmount;
    
    // Days calculation
    const timeDiff = new Date(goal.targetDate).getTime() - now.getTime();
    const daysRemaining = Math.max(0, Math.ceil(timeDiff / (1000 * 3600 * 24)));
    const weeksRemaining = Math.max(0, daysRemaining / 7);
    const monthsRemaining = Math.max(0, daysRemaining / 30);

    // Health Status
    let healthStatus = 'On Track';
    if (goal.status === 'Completed') {
      healthStatus = 'Completed';
    } else if (daysRemaining === 0 && remainingAmount > 0) {
      healthStatus = 'Overdue';
    } else {
      // Expected progress based on time
      const createdAt = new Date(goal.createdAt).getTime();
      const totalDuration = new Date(goal.targetDate).getTime() - createdAt;
      const timeElapsed = now.getTime() - createdAt;
      const expectedProgressPercentage = Math.min(100, (timeElapsed / totalDuration) * 100);
      
      if (progressPercentage < expectedProgressPercentage - 10) {
        healthStatus = 'At Risk';
      }
    }

    // Forecasting
    const requiredDaily = daysRemaining > 0 ? remainingAmount / daysRemaining : 0;
    const requiredWeekly = weeksRemaining > 0 ? remainingAmount / weeksRemaining : 0;
    const requiredMonthly = monthsRemaining > 0 ? remainingAmount / monthsRemaining : 0;

    return {
      _id: goal._id,
      title: goal.title,
      targetAmount: goal.targetAmount,
      savedAmount: goal.savedAmount,
      remainingAmount,
      progressPercentage: parseFloat(progressPercentage.toFixed(2)),
      daysRemaining,
      targetDate: goal.targetDate,
      category: goal.category,
      priority: goal.priority,
      status: goal.status,
      healthStatus,
      forecast: {
        requiredDaily: parseFloat(requiredDaily.toFixed(2)),
        requiredWeekly: parseFloat(requiredWeekly.toFixed(2)),
        requiredMonthly: parseFloat(requiredMonthly.toFixed(2)),
      }
    };
  });

  res.json({
    success: true,
    data: progressData
  });
});

// @desc    Get goal statistics
// @route   GET /api/goals/stats
// @access  Private
const getGoalStats = asyncHandler(async (req, res) => {
  const goals = await SavingsGoal.find({ userId: req.user._id, isArchived: false });

  let activeGoals = 0;
  let completedGoals = 0;
  let totalTargetAmount = 0;
  let totalSavedAmount = 0;

  goals.forEach(g => {
    totalTargetAmount += g.targetAmount;
    totalSavedAmount += g.savedAmount;
    if (g.status === 'Completed') completedGoals++;
    if (g.status === 'Active') activeGoals++;
  });

  const overallProgress = totalTargetAmount > 0 ? (totalSavedAmount / totalTargetAmount) * 100 : 0;
  const achievementRate = goals.length > 0 ? (completedGoals / goals.length) * 100 : 0;

  res.json({
    success: true,
    data: {
      totalGoals: goals.length,
      activeGoals,
      completedGoals,
      totalTargetAmount,
      totalSavedAmount,
      overallProgress: parseFloat(overallProgress.toFixed(2)),
      achievementRate: parseFloat(achievementRate.toFixed(2)),
    }
  });
});

// @desc    Get goal insights
// @route   GET /api/goals/insights
// @access  Private
const getGoalInsights = asyncHandler(async (req, res) => {
  const goals = await SavingsGoal.find({ userId: req.user._id, isArchived: false, status: 'Active' });

  const now = new Date();

  let nearestGoal = null;
  let highestPriorityGoal = null;
  let mostFundedGoal = null;

  if (goals.length > 0) {
    // Nearest Deadline
    const sortedByDate = [...goals].sort((a, b) => new Date(a.targetDate) - new Date(b.targetDate));
    nearestGoal = sortedByDate[0];

    // Highest Priority (High > Medium > Low) - If multiple High, pick closest date
    const priorityWeights = { 'High': 3, 'Medium': 2, 'Low': 1 };
    const sortedByPriority = [...goals].sort((a, b) => {
      if (priorityWeights[b.priority] !== priorityWeights[a.priority]) {
        return priorityWeights[b.priority] - priorityWeights[a.priority];
      }
      return new Date(a.targetDate) - new Date(b.targetDate);
    });
    highestPriorityGoal = sortedByPriority[0];

    // Most Funded (by percentage)
    const sortedByFunding = [...goals].sort((a, b) => {
      const pctA = a.savedAmount / a.targetAmount;
      const pctB = b.savedAmount / b.targetAmount;
      return pctB - pctA;
    });
    mostFundedGoal = sortedByFunding[0];
  }

  // Completed this month
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const completedThisMonth = await SavingsGoal.countDocuments({
    userId: req.user._id,
    isArchived: false,
    status: 'Completed',
    completedAt: { $gte: startOfMonth }
  });

  res.json({
    success: true,
    data: {
      nearestGoal: nearestGoal ? { title: nearestGoal.title, targetDate: nearestGoal.targetDate } : null,
      highestPriorityGoal: highestPriorityGoal ? { title: highestPriorityGoal.title, priority: highestPriorityGoal.priority } : null,
      mostFundedGoal: mostFundedGoal ? { 
        title: mostFundedGoal.title, 
        progress: parseFloat(((mostFundedGoal.savedAmount / mostFundedGoal.targetAmount) * 100).toFixed(2)) 
      } : null,
      completedThisMonth
    }
  });
});

module.exports = {
  createGoal,
  getGoals,
  getGoalById,
  updateGoal,
  deleteGoal,
  addContribution,
  getGoalProgress,
  getGoalStats,
  getGoalInsights,
};
