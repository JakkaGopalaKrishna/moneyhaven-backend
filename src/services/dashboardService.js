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

  const Budget = require('../models/Budget');

  // Budget Summary for current month
  const targetMonth = new Date().getMonth() + 1;
  const targetYear = new Date().getFullYear();
  const activeBudgets = await Budget.find({ userId: user._id, month: targetMonth, year: targetYear, isActive: true }).populate('categoryId');

  let totalBudgetAmount = 0;
  let totalBudgetSpending = 0;
  let mostOverspent = null;
  let highestRemaining = null;
  let totalHealthScore = 0;

  if (activeBudgets.length > 0) {
    let maxOverspentPct = 0;
    let maxRemainingAmt = -1;

    for (const budget of activeBudgets) {
      totalBudgetAmount += budget.amount;
      
      const spentResult = await Transaction.aggregate([
        {
          $match: {
            userId: user._id,
            categoryId: budget.categoryId._id,
            isDeleted: false,
            transactionDate: { $gte: startOfMonth, $lte: new Date(targetYear, targetMonth, 0, 23, 59, 59) },
            type: 'expense'
          }
        },
        { $group: { _id: null, totalSpent: { $sum: '$amount' } } }
      ]);
      const spent = spentResult.length > 0 ? spentResult[0].totalSpent : 0;
      totalBudgetSpending += spent;

      const remaining = Math.max(0, budget.amount - spent);
      const percentageUsed = (spent / budget.amount) * 100;

      if (percentageUsed > maxOverspentPct) {
        maxOverspentPct = percentageUsed;
        mostOverspent = { category: budget.categoryId.name, percentage: percentageUsed };
      }

      if (remaining > maxRemainingAmt) {
        maxRemainingAmt = remaining;
        highestRemaining = { category: budget.categoryId.name, amount: remaining };
      }

      let score = 100;
      if (percentageUsed > 100) score = 0;
      else if (percentageUsed > 80) score = 100 - ((percentageUsed - 80) * 5);
      totalHealthScore += score;
    }
    totalHealthScore = Math.round(totalHealthScore / activeBudgets.length);
  } else {
    totalHealthScore = 100;
  }

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
    budgetSummary: {
      totalBudgetAmount,
      totalBudgetSpending,
      overallRemainingBudget: Math.max(0, totalBudgetAmount - totalBudgetSpending),
      overallBudgetUsagePercentage: totalBudgetAmount > 0 ? parseFloat(((totalBudgetSpending / totalBudgetAmount) * 100).toFixed(2)) : 0,
      mostOverspent,
      highestRemaining,
      budgetHealthScore: totalHealthScore,
    }
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
