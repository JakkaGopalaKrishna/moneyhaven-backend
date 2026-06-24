const asyncHandler = require('../utils/asyncHandler');
const analyticsService = require('../services/analyticsService');

// @desc    Get Overview Analytics
// @route   GET /api/analytics/overview
// @access  Private
const getOverview = asyncHandler(async (req, res) => {
  const data = await analyticsService.getOverviewAnalytics(req.user._id);
  res.json({ success: true, data });
});

// @desc    Get Spending Analytics
// @route   GET /api/analytics/spending
// @access  Private
const getSpending = asyncHandler(async (req, res) => {
  const data = await analyticsService.getSpendingAnalytics(req.user._id);
  res.json({ success: true, data });
});

// @desc    Get Income Analytics
// @route   GET /api/analytics/income
// @access  Private
const getIncome = asyncHandler(async (req, res) => {
  const data = await analyticsService.getIncomeAnalytics(req.user._id);
  res.json({ success: true, data });
});

// @desc    Get Budget Analytics
// @route   GET /api/analytics/budgets
// @access  Private
const getBudgets = asyncHandler(async (req, res) => {
  const data = await analyticsService.getBudgetAnalytics(req.user._id);
  res.json({ success: true, data });
});

// @desc    Get Goal Analytics
// @route   GET /api/analytics/goals
// @access  Private
const getGoals = asyncHandler(async (req, res) => {
  const data = await analyticsService.getGoalAnalytics(req.user._id);
  res.json({ success: true, data });
});

// @desc    Get Financial Health Analytics
// @route   GET /api/analytics/health
// @access  Private
const getHealth = asyncHandler(async (req, res) => {
  const data = await analyticsService.getFinancialHealth(req.user._id);
  res.json({ success: true, data });
});

// @desc    Get Insights Engine
// @route   GET /api/analytics/insights
// @access  Private
const getInsights = asyncHandler(async (req, res) => {
  const data = await analyticsService.getInsightsEngine(req.user._id);
  res.json({ success: true, data });
});

// @desc    Get Forecasting
// @route   GET /api/analytics/forecast
// @access  Private
const getForecast = asyncHandler(async (req, res) => {
  const data = await analyticsService.getForecasting(req.user._id);
  res.json({ success: true, data });
});

module.exports = {
  getOverview,
  getSpending,
  getIncome,
  getBudgets,
  getGoals,
  getHealth,
  getInsights,
  getForecast,
};
