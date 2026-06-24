const User = require('../models/User');
const { calculateCurrentBalance, calculateSavings, calculateFinancialHealth } = require('../utils/financeCalculations');

const getDashboardSummaryData = async (userId) => {
  const user = await User.findById(userId);
  if (!user) {
    throw new Error('User not found');
  }

  // Placeholders for future transaction data
  const totalIncome = 0;
  const totalExpenses = 0;
  const totalTransactions = 0;
  const monthlyIncome = 0;
  const monthlyExpenses = 0;

  const currentBalance = calculateCurrentBalance(user.openingBalance, totalIncome, totalExpenses);
  const savings = calculateSavings(totalIncome, totalExpenses);
  const healthScore = calculateFinancialHealth();

  return {
    openingBalance: user.openingBalance,
    currentBalance,
    totalIncome,
    totalExpenses,
    totalTransactions,
    savings,
    monthlyIncome,
    monthlyExpenses,
    memberSince: user.createdAt,
    healthScore,
  };
};

const getDashboardStatsData = async (userId) => {
  const user = await User.findById(userId);
  if (!user) {
    throw new Error('User not found');
  }

  // Future phase: implement aggregated stats for charts, categories, etc.
  return {
    incomeByCategory: [],
    expensesByCategory: [],
    recentTransactions: [],
  };
};

module.exports = {
  getDashboardSummaryData,
  getDashboardStatsData,
};
