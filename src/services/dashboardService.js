const User = require('../models/User');
const Transaction = require('../models/Transaction');
const { calculateCurrentBalance, calculateSavings, calculateFinancialHealth } = require('../utils/financeCalculations');

const getDashboardSummaryData = async (userId) => {
  const user = await User.findById(userId);
  if (!user) {
    throw new Error('User not found');
  }

  // Aggregate Total Income and Expenses
  const allTransactions = await Transaction.aggregate([
    { $match: { userId: user._id, isDeleted: false } },
    {
      $group: {
        _id: '$type',
        total: { $sum: '$amount' },
        count: { $sum: 1 }
      }
    }
  ]);

  let totalIncome = 0;
  let totalExpenses = 0;
  let totalTransactions = 0;

  allTransactions.forEach(t => {
    if (t._id === 'income') {
      totalIncome = t.total;
      totalTransactions += t.count;
    } else if (t._id === 'expense') {
      totalExpenses = t.total;
      totalTransactions += t.count;
    }
  });

  // Aggregate Monthly Income and Expenses
  const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const monthlyTransactions = await Transaction.aggregate([
    { $match: { userId: user._id, isDeleted: false, transactionDate: { $gte: startOfMonth } } },
    {
      $group: {
        _id: '$type',
        total: { $sum: '$amount' }
      }
    }
  ]);

  let monthlyIncome = 0;
  let monthlyExpenses = 0;

  monthlyTransactions.forEach(t => {
    if (t._id === 'income') monthlyIncome = t.total;
    if (t._id === 'expense') monthlyExpenses = t.total;
  });

  const currentBalance = calculateCurrentBalance(user.openingBalance, totalIncome, totalExpenses);
  const savings = calculateSavings(totalIncome, totalExpenses);
  const healthScore = calculateFinancialHealth(); // Future phases can make this dynamic

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

  // Recent transactions (Top 5)
  const recentTransactions = await Transaction.find({ userId: user._id, isDeleted: false })
    .sort({ transactionDate: -1, createdAt: -1 })
    .limit(5);

  return {
    incomeByCategory: [],
    expensesByCategory: [],
    recentTransactions,
  };
};

module.exports = {
  getDashboardSummaryData,
  getDashboardStatsData,
};
