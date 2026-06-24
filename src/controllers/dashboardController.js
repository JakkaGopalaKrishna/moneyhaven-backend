const asyncHandler = require('../utils/asyncHandler');
const { getDashboardSummaryData, getDashboardStatsData } = require('../services/dashboardService');

// @desc    Get dashboard summary
// @route   GET /api/dashboard/summary
// @access  Private
const getDashboardSummary = asyncHandler(async (req, res) => {
  const summary = await getDashboardSummaryData(req.user._id);

  res.json({
    success: true,
    summary,
  });
});

// @desc    Get dashboard statistics
// @route   GET /api/dashboard/stats
// @access  Private
const getDashboardStats = asyncHandler(async (req, res) => {
  const stats = await getDashboardStatsData(req.user._id);

  res.json({
    success: true,
    stats,
  });
});

module.exports = {
  getDashboardSummary,
  getDashboardStats,
};
