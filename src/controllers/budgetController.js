const Budget = require('../models/Budget');
const Category = require('../models/Category');
const Transaction = require('../models/Transaction');
const asyncHandler = require('../utils/asyncHandler');
const mongoose = require('mongoose');

// Helper to get spending for a category in a specific month/year
const getSpendingForCategory = async (userId, categoryId, month, year) => {
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59, 999);

  const result = await Transaction.aggregate([
    {
      $match: {
        userId: new mongoose.Types.ObjectId(userId),
        categoryId: new mongoose.Types.ObjectId(categoryId),
        isDeleted: false,
        transactionDate: { $gte: startDate, $lte: endDate },
        type: 'expense'
      }
    },
    {
      $group: {
        _id: null,
        totalSpent: { $sum: '$amount' }
      }
    }
  ]);

  return result.length > 0 ? result[0].totalSpent : 0;
};

// @desc    Create new budget
// @route   POST /api/budgets
// @access  Private
const createBudget = asyncHandler(async (req, res) => {
  const { categoryId, amount, month, year, alertThreshold, notes } = req.body;

  if (!categoryId || !amount || !month || !year) {
    res.status(400);
    throw new Error('Please provide categoryId, amount, month, and year');
  }

  // Ensure category is Expense only
  const category = await Category.findOne({ _id: categoryId, userId: req.user._id, isActive: true });
  if (!category) {
    res.status(404);
    throw new Error('Category not found');
  }

  if (category.type !== 'expense') {
    res.status(400);
    throw new Error('Budgets can only be created for expense categories');
  }

  // Check for duplicates
  const existingBudget = await Budget.findOne({
    userId: req.user._id,
    categoryId,
    month,
    year,
    isActive: true
  });

  if (existingBudget) {
    res.status(400);
    throw new Error('A budget for this category and period already exists');
  }

  const budget = await Budget.create({
    userId: req.user._id,
    categoryId,
    amount,
    month,
    year,
    alertThreshold: alertThreshold || 80,
    notes,
  });

  res.status(201).json({
    success: true,
    data: budget,
  });
});

// @desc    Get all budgets
// @route   GET /api/budgets
// @access  Private
const getBudgets = asyncHandler(async (req, res) => {
  const { month, year } = req.query;

  const query = { userId: req.user._id, isActive: true };
  if (month) query.month = parseInt(month, 10);
  if (year) query.year = parseInt(year, 10);

  const budgets = await Budget.find(query).populate('categoryId', 'name icon color').sort({ year: -1, month: -1 });

  res.json({
    success: true,
    count: budgets.length,
    data: budgets,
  });
});

// @desc    Get single budget
// @route   GET /api/budgets/:id
// @access  Private
const getBudgetById = asyncHandler(async (req, res) => {
  const budget = await Budget.findOne({ _id: req.params.id, userId: req.user._id, isActive: true })
    .populate('categoryId', 'name icon color');

  if (!budget) {
    res.status(404);
    throw new Error('Budget not found');
  }

  res.json({
    success: true,
    data: budget,
  });
});

// @desc    Update budget
// @route   PUT /api/budgets/:id
// @access  Private
const updateBudget = asyncHandler(async (req, res) => {
  const budget = await Budget.findOne({ _id: req.params.id, userId: req.user._id, isActive: true });

  if (!budget) {
    res.status(404);
    throw new Error('Budget not found');
  }

  const { amount, alertThreshold, notes } = req.body;

  // Prevent reduction below spent amount
  if (amount !== undefined) {
    const spentAmount = await getSpendingForCategory(req.user._id, budget.categoryId, budget.month, budget.year);
    if (amount < spentAmount) {
      res.status(400);
      throw new Error(`Cannot reduce budget below already spent amount (₹${spentAmount})`);
    }
    budget.amount = amount;
  }

  if (alertThreshold !== undefined) budget.alertThreshold = alertThreshold;
  if (notes !== undefined) budget.notes = notes;

  await budget.save();

  res.json({
    success: true,
    data: budget,
  });
});

// @desc    Delete budget (Soft Delete)
// @route   DELETE /api/budgets/:id
// @access  Private
const deleteBudget = asyncHandler(async (req, res) => {
  const budget = await Budget.findOne({ _id: req.params.id, userId: req.user._id, isActive: true });

  if (!budget) {
    res.status(404);
    throw new Error('Budget not found');
  }

  budget.isActive = false;
  await budget.save();

  res.json({
    success: true,
    message: 'Budget deleted successfully',
  });
});

// @desc    Get budget progress and insights
// @route   GET /api/budgets/progress
// @access  Private
const getBudgetProgress = asyncHandler(async (req, res) => {
  const { month, year } = req.query;
  const targetMonth = month ? parseInt(month, 10) : new Date().getMonth() + 1;
  const targetYear = year ? parseInt(year, 10) : new Date().getFullYear();

  const budgets = await Budget.find({
    userId: req.user._id,
    month: targetMonth,
    year: targetYear,
    isActive: true
  }).populate('categoryId', 'name icon color');

  const now = new Date();
  const isCurrentMonth = now.getMonth() + 1 === targetMonth && now.getFullYear() === targetYear;
  const isPastMonth = targetYear < now.getFullYear() || (targetYear === now.getFullYear() && targetMonth < now.getMonth() + 1);
  const isFutureMonth = targetYear > now.getFullYear() || (targetYear === now.getFullYear() && targetMonth > now.getMonth() + 1);

  const totalDaysInMonth = new Date(targetYear, targetMonth, 0).getDate();
  const daysPassed = isCurrentMonth ? now.getDate() : (isPastMonth ? totalDaysInMonth : 0);
  const daysRemaining = Math.max(0, totalDaysInMonth - daysPassed);

  let periodStatus = 'Active';
  if (isPastMonth) periodStatus = 'Completed';
  if (isFutureMonth) periodStatus = 'Upcoming';

  const progressData = await Promise.all(budgets.map(async (budget) => {
    const spentAmount = await getSpendingForCategory(req.user._id, budget.categoryId._id, targetMonth, targetYear);
    const percentageUsed = budget.amount > 0 ? (spentAmount / budget.amount) * 100 : 0;
    const remainingAmount = Math.max(0, budget.amount - spentAmount);
    
    let status = 'Safe';
    if (percentageUsed >= 100) status = 'Exceeded';
    else if (percentageUsed >= budget.alertThreshold) status = 'Warning';

    let projectedSpending = 0;
    if (isCurrentMonth && daysPassed > 0) {
      projectedSpending = (spentAmount / daysPassed) * totalDaysInMonth;
    } else if (isPastMonth) {
      projectedSpending = spentAmount;
    }

    return {
      _id: budget._id,
      category: budget.categoryId,
      budgetAmount: budget.amount,
      spentAmount,
      remainingAmount,
      percentageUsed: parseFloat(percentageUsed.toFixed(2)),
      status,
      alertThreshold: budget.alertThreshold,
      notes: budget.notes,
      projectedSpending: parseFloat(projectedSpending.toFixed(2)),
      createdAt: budget.createdAt,
    };
  }));

  // Insights
  let topOverspentCategory = null;
  let topUnderutilizedCategory = null;
  let totalHealthScore = 0;

  if (progressData.length > 0) {
    let maxOverspentPct = 0;
    let minUsedPct = 101;

    progressData.forEach(p => {
      // Overspent
      if (p.percentageUsed > maxOverspentPct) {
        maxOverspentPct = p.percentageUsed;
        topOverspentCategory = p;
      }
      // Underutilized
      if (p.percentageUsed < minUsedPct) {
        minUsedPct = p.percentageUsed;
        topUnderutilizedCategory = p;
      }

      // Health score contribution: Max 100, drops as percentageUsed increases over 80%.
      let score = 100;
      if (p.percentageUsed > 100) score = 0;
      else if (p.percentageUsed > 80) score = 100 - ((p.percentageUsed - 80) * 5); // 80->100, 100->0
      totalHealthScore += score;
    });

    totalHealthScore = Math.round(totalHealthScore / progressData.length);
  } else {
    totalHealthScore = 100; // Default if no budgets
  }

  res.json({
    success: true,
    data: {
      periodStatus,
      daysRemaining,
      totalDaysInMonth,
      budgets: progressData,
      insights: {
        topOverspentCategory,
        topUnderutilizedCategory,
        budgetHealthScore: totalHealthScore
      }
    }
  });
});

// @desc    Get budget history
// @route   GET /api/budgets/history
// @access  Private
const getBudgetHistory = asyncHandler(async (req, res) => {
  // Can be expanded to return multiple past months progress
  // For now, it delegates to getBudgets if specific filters are provided, or we can fetch completed months
  const budgets = await Budget.find({ userId: req.user._id, isActive: true })
    .populate('categoryId', 'name icon color')
    .sort({ year: -1, month: -1 });

  res.json({
    success: true,
    count: budgets.length,
    data: budgets,
  });
});

// @desc    Get budget statistics
// @route   GET /api/budgets/stats
// @access  Private
const getBudgetStats = asyncHandler(async (req, res) => {
  const { month, year } = req.query;
  const targetMonth = month ? parseInt(month, 10) : new Date().getMonth() + 1;
  const targetYear = year ? parseInt(year, 10) : new Date().getFullYear();

  const budgets = await Budget.find({
    userId: req.user._id,
    month: targetMonth,
    year: targetYear,
    isActive: true
  });

  let totalBudgetAmount = 0;
  let totalSpending = 0;

  for (const budget of budgets) {
    totalBudgetAmount += budget.amount;
    const spent = await getSpendingForCategory(req.user._id, budget.categoryId, targetMonth, targetYear);
    totalSpending += spent;
  }

  res.json({
    success: true,
    data: {
      totalBudgets: budgets.length,
      totalBudgetAmount,
      totalSpending,
      remainingBudget: Math.max(0, totalBudgetAmount - totalSpending),
    }
  });
});

module.exports = {
  createBudget,
  getBudgets,
  getBudgetById,
  updateBudget,
  deleteBudget,
  getBudgetProgress,
  getBudgetHistory,
  getBudgetStats,
};
