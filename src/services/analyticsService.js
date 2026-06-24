const Transaction = require('../models/Transaction');
const Category = require('../models/Category');
const Budget = require('../models/Budget');
const SavingsGoal = require('../models/SavingsGoal');
const FinancialHealthHistory = require('../models/FinancialHealthHistory');
const cacheService = require('./analyticsCacheService');
const dayjs = require('dayjs');
const mongoose = require('mongoose');

// Helper to calculate percentage change
const calculatePercentageChange = (current, previous) => {
  if (previous === 0) return current > 0 ? 100 : 0;
  return parseFloat((((current - previous) / previous) * 100).toFixed(2));
};

const getOverviewAnalytics = async (userId) => {
  const cacheKey = `${userId}_overview`;
  const cached = cacheService.get(cacheKey);
  if (cached) return cached;

  const now = dayjs();
  const startOfThisMonth = now.startOf('month').toDate();
  const startOfLastMonth = now.subtract(1, 'month').startOf('month').toDate();
  const endOfLastMonth = now.subtract(1, 'month').endOf('month').toDate();

  const transactions = await Transaction.find({ userId, isDeleted: false });

  let thisMonthIncome = 0;
  let lastMonthIncome = 0;
  let thisMonthExpenses = 0;
  let lastMonthExpenses = 0;
  let totalIncome = 0;
  let totalExpenses = 0;

  transactions.forEach(t => {
    const d = new Date(t.transactionDate);
    if (t.type === 'income') {
      totalIncome += t.amount;
      if (d >= startOfThisMonth) thisMonthIncome += t.amount;
      else if (d >= startOfLastMonth && d <= endOfLastMonth) lastMonthIncome += t.amount;
    } else {
      totalExpenses += t.amount;
      if (d >= startOfThisMonth) thisMonthExpenses += t.amount;
      else if (d >= startOfLastMonth && d <= endOfLastMonth) lastMonthExpenses += t.amount;
    }
  });

  const currentBalance = totalIncome - totalExpenses;
  const savingsRate = totalIncome > 0 ? parseFloat((((totalIncome - totalExpenses) / totalIncome) * 100).toFixed(2)) : 0;
  const incomeChangePercentage = calculatePercentageChange(thisMonthIncome, lastMonthIncome);
  const expenseChangePercentage = calculatePercentageChange(thisMonthExpenses, lastMonthExpenses);

  // Approximate average based on first transaction date
  let averageMonthlyIncome = totalIncome;
  let averageMonthlyExpenses = totalExpenses;
  if (transactions.length > 0) {
    const firstTxnDate = dayjs(Math.min(...transactions.map(t => new Date(t.transactionDate).getTime())));
    const monthsActive = Math.max(1, now.diff(firstTxnDate, 'month') + 1);
    averageMonthlyIncome = totalIncome / monthsActive;
    averageMonthlyExpenses = totalExpenses / monthsActive;
  }

  const result = {
    totalIncome,
    totalExpenses,
    currentBalance,
    savingsRate,
    averageMonthlyIncome: parseFloat(averageMonthlyIncome.toFixed(2)),
    averageMonthlyExpenses: parseFloat(averageMonthlyExpenses.toFixed(2)),
    transactionCount: transactions.length,
    thisMonthIncome,
    lastMonthIncome,
    thisMonthExpenses,
    lastMonthExpenses,
    incomeChangePercentage,
    expenseChangePercentage
  };

  cacheService.set(cacheKey, result);
  return result;
};

const getSpendingAnalytics = async (userId) => {
  const cacheKey = `${userId}_spending`;
  const cached = cacheService.get(cacheKey);
  if (cached) return cached;

  const now = dayjs();
  const startOfThisMonth = now.startOf('month').toDate();
  const startOfLastMonth = now.subtract(1, 'month').startOf('month').toDate();
  const endOfLastMonth = now.subtract(1, 'month').endOf('month').toDate();

  const pipeline = [
    { $match: { userId: new mongoose.Types.ObjectId(userId), type: 'expense', isDeleted: false } },
    { $lookup: { from: 'categories', localField: 'categoryId', foreignField: '_id', as: 'category' } },
    { $unwind: { path: '$category', preserveNullAndEmptyArrays: true } }
  ];

  const expenses = await Transaction.aggregate(pipeline);

  const categoryMap = {};
  const heatmapMap = {};
  const monthlyTrendMap = {}; // by YYYY-MM
  
  expenses.forEach(t => {
    const catName = t.category ? t.category.name : 'Uncategorized';
    const dateStr = dayjs(t.transactionDate).format('YYYY-MM-DD');
    const monthStr = dayjs(t.transactionDate).format('YYYY-MM');
    const amt = t.amount;

    // Category Breakdown
    if (!categoryMap[catName]) categoryMap[catName] = { total: 0, currentMonth: 0, previousMonth: 0 };
    categoryMap[catName].total += amt;
    
    const d = new Date(t.transactionDate);
    if (d >= startOfThisMonth) categoryMap[catName].currentMonth += amt;
    else if (d >= startOfLastMonth && d <= endOfLastMonth) categoryMap[catName].previousMonth += amt;

    // Heatmap
    heatmapMap[dateStr] = (heatmapMap[dateStr] || 0) + amt;

    // Monthly Trend
    monthlyTrendMap[monthStr] = (monthlyTrendMap[monthStr] || 0) + amt;
  });

  // Top 5 Expense Categories
  const categoryBreakdown = Object.keys(categoryMap).map(cat => ({
    category: cat,
    amount: categoryMap[cat].total,
    currentMonth: categoryMap[cat].currentMonth,
    previousMonth: categoryMap[cat].previousMonth,
    growthPercentage: calculatePercentageChange(categoryMap[cat].currentMonth, categoryMap[cat].previousMonth)
  })).sort((a, b) => b.amount - a.amount);

  const top5Categories = categoryBreakdown.slice(0, 5);
  const topExpenseCategory = categoryBreakdown.length > 0 ? categoryBreakdown[0].category : null;

  const dailyExpenseTrend = Object.keys(heatmapMap).map(date => ({ date, amount: heatmapMap[date] })).sort((a, b) => new Date(a.date) - new Date(b.date));
  const monthlyExpenseTrend = Object.keys(monthlyTrendMap).map(month => ({ month, amount: monthlyTrendMap[month] })).sort((a, b) => a.month.localeCompare(b.month));

  const result = {
    categoryBreakdown,
    top5Categories,
    topExpenseCategory,
    monthlyExpenseTrend,
    dailyExpenseTrend
  };

  cacheService.set(cacheKey, result);
  return result;
};

const getIncomeAnalytics = async (userId) => {
  const cacheKey = `${userId}_income`;
  const cached = cacheService.get(cacheKey);
  if (cached) return cached;

  const pipeline = [
    { $match: { userId: new mongoose.Types.ObjectId(userId), type: 'income', isDeleted: false } },
    { $lookup: { from: 'categories', localField: 'categoryId', foreignField: '_id', as: 'category' } },
    { $unwind: { path: '$category', preserveNullAndEmptyArrays: true } }
  ];

  const incomes = await Transaction.aggregate(pipeline);

  const categoryMap = {};
  const monthlyTrendMap = {};
  const heatmapMap = {};
  
  incomes.forEach(t => {
    const catName = t.category ? t.category.name : 'Uncategorized';
    const monthStr = dayjs(t.transactionDate).format('YYYY-MM');
    const dateStr = dayjs(t.transactionDate).format('YYYY-MM-DD');
    const amt = t.amount;

    categoryMap[catName] = (categoryMap[catName] || 0) + amt;
    monthlyTrendMap[monthStr] = (monthlyTrendMap[monthStr] || 0) + amt;
    heatmapMap[dateStr] = (heatmapMap[dateStr] || 0) + amt;
  });

  const incomeSources = Object.keys(categoryMap).map(cat => ({
    category: cat,
    amount: categoryMap[cat]
  })).sort((a, b) => b.amount - a.amount);

  const top5Categories = incomeSources.slice(0, 5);
  const topIncomeCategory = incomeSources.length > 0 ? incomeSources[0].category : null;
  const monthlyIncomeTrend = Object.keys(monthlyTrendMap).map(month => ({ month, amount: monthlyTrendMap[month] })).sort((a, b) => a.month.localeCompare(b.month));
  const dailyIncomeTrend = Object.keys(heatmapMap).map(date => ({ date, amount: heatmapMap[date] })).sort((a, b) => new Date(a.date) - new Date(b.date));

  const result = {
    incomeSources,
    top5Categories,
    topIncomeCategory,
    monthlyIncomeTrend,
    dailyIncomeTrend
  };

  cacheService.set(cacheKey, result);
  return result;
};

const getBudgetAnalytics = async (userId) => {
  const cacheKey = `${userId}_budgets`;
  const cached = cacheService.get(cacheKey);
  if (cached) return cached;

  const currentMonth = dayjs().month() + 1;
  const currentYear = dayjs().year();

  const budgets = await Budget.find({ userId, month: currentMonth, year: currentYear }).populate('categoryId');

  // To find usage, we need spending for these categories this month
  const startOfMonth = dayjs().startOf('month').toDate();
  const endOfMonth = dayjs().endOf('month').toDate();

  const pipeline = [
    { 
      $match: { 
        userId: new mongoose.Types.ObjectId(userId), 
        type: 'expense', 
        isDeleted: false,
        transactionDate: { $gte: startOfMonth, $lte: endOfMonth }
      } 
    },
    { $group: { _id: '$categoryId', spent: { $sum: '$amount' } } }
  ];

  const spending = await Transaction.aggregate(pipeline);
  const spendingMap = {};
  spending.forEach(s => { spendingMap[s._id.toString()] = s.spent; });

  const budgetUtilization = budgets.map(b => {
    const spent = spendingMap[b.categoryId?._id.toString()] || 0;
    const pct = b.amount > 0 ? (spent / b.amount) * 100 : 0;
    return {
      category: b.categoryId ? b.categoryId.name : 'Unknown',
      budgetAmount: b.amount,
      spentAmount: spent,
      utilizationPercentage: parseFloat(pct.toFixed(2))
    };
  }).sort((a, b) => b.utilizationPercentage - a.utilizationPercentage);

  const mostOverspentCategory = budgetUtilization.length > 0 ? budgetUtilization[0] : null;
  const mostUnderutilizedCategory = budgetUtilization.length > 0 ? budgetUtilization[budgetUtilization.length - 1] : null;
  
  let totalPct = 0;
  budgetUtilization.forEach(b => totalPct += b.utilizationPercentage);
  const averageBudgetUsage = budgetUtilization.length > 0 ? parseFloat((totalPct / budgetUtilization.length).toFixed(2)) : 0;

  const result = {
    budgetUtilization,
    mostOverspentCategory,
    mostUnderutilizedCategory,
    averageBudgetUsage
  };

  cacheService.set(cacheKey, result);
  return result;
};

const getGoalAnalytics = async (userId) => {
  const cacheKey = `${userId}_goals`;
  const cached = cacheService.get(cacheKey);
  if (cached) return cached;

  const goals = await SavingsGoal.find({ userId, isArchived: false });
  
  let activeGoals = 0;
  let completedGoals = 0;
  let totalTimeMs = 0;
  let completedWithTime = 0;

  goals.forEach(g => {
    if (g.status === 'Active') activeGoals++;
    if (g.status === 'Completed') {
      completedGoals++;
      if (g.completedAt && g.createdAt) {
        totalTimeMs += new Date(g.completedAt).getTime() - new Date(g.createdAt).getTime();
        completedWithTime++;
      }
    }
  });

  const achievementRate = goals.length > 0 ? parseFloat(((completedGoals / goals.length) * 100).toFixed(2)) : 0;
  const averageGoalCompletionTimeDays = completedWithTime > 0 ? parseFloat((totalTimeMs / completedWithTime / (1000 * 3600 * 24)).toFixed(2)) : 0;

  const result = {
    activeGoals,
    completedGoals,
    achievementRate,
    averageGoalCompletionTime: averageGoalCompletionTimeDays // in days
  };

  cacheService.set(cacheKey, result);
  return result;
};

const getFinancialHealth = async (userId) => {
  // Always calculate fresh, don't cache this as we want to save snapshots accurately
  const overview = await getOverviewAnalytics(userId);
  const budgets = await getBudgetAnalytics(userId);
  const goals = await getGoalAnalytics(userId);

  // 1. Savings Rate Score (Max 25)
  // 20%+ = 25, 10-20% = 15, <10% = 5
  let savingsRateScore = 0;
  if (overview.savingsRate >= 20) savingsRateScore = 25;
  else if (overview.savingsRate >= 10) savingsRateScore = 15;
  else if (overview.savingsRate > 0) savingsRateScore = 5;

  // 2. Budget Compliance Score (Max 25)
  // Average Usage < 80% = 25, < 95% = 15, > 100% = 0
  let budgetComplianceScore = 25; // default if no budgets
  if (budgets.budgetUtilization.length > 0) {
    if (budgets.averageBudgetUsage <= 80) budgetComplianceScore = 25;
    else if (budgets.averageBudgetUsage <= 95) budgetComplianceScore = 15;
    else if (budgets.averageBudgetUsage <= 100) budgetComplianceScore = 5;
    else budgetComplianceScore = 0;
  }

  // 3. Goal Achievement Score (Max 25)
  let goalAchievementScore = 15; // default if no goals
  if (goals.activeGoals > 0 || goals.completedGoals > 0) {
    if (goals.achievementRate >= 50) goalAchievementScore = 25;
    else if (goals.achievementRate >= 25) goalAchievementScore = 15;
    else goalAchievementScore = 5;
  }

  // 4. Expense Control Score (Max 25)
  // If expenseChangePercentage is negative or small
  let expenseControlScore = 15; // default
  if (overview.expenseChangePercentage <= 5) expenseControlScore = 25;
  else if (overview.expenseChangePercentage <= 15) expenseControlScore = 15;
  else expenseControlScore = 5;

  const totalScore = savingsRateScore + budgetComplianceScore + goalAchievementScore + expenseControlScore;

  // Snapshot tracking (max 1 per day to avoid spam)
  const today = dayjs().startOf('day').toDate();
  const existingSnapshot = await FinancialHealthHistory.findOne({
    userId,
    snapshotDate: { $gte: today }
  });

  if (!existingSnapshot) {
    await FinancialHealthHistory.create({
      userId,
      score: totalScore,
      breakdown: { savingsRateScore, budgetComplianceScore, goalAchievementScore, expenseControlScore },
      snapshotDate: new Date()
    });
  } else {
    // update today's snapshot
    existingSnapshot.score = totalScore;
    existingSnapshot.breakdown = { savingsRateScore, budgetComplianceScore, goalAchievementScore, expenseControlScore };
    await existingSnapshot.save();
  }

  // Fetch history for charting
  const history = await FinancialHealthHistory.find({ userId }).sort({ snapshotDate: 1 }).limit(30);
  const healthTrend = history.map(h => ({ date: dayjs(h.snapshotDate).format('YYYY-MM-DD'), score: h.score }));

  return {
    score: totalScore,
    breakdown: { savingsRateScore, budgetComplianceScore, goalAchievementScore, expenseControlScore },
    healthTrend
  };
};

const getInsightsEngine = async (userId) => {
  const overview = await getOverviewAnalytics(userId);
  const spending = await getSpendingAnalytics(userId);
  const budgets = await getBudgetAnalytics(userId);

  const insights = [];
  const recommendations = [];

  // Insights
  if (overview.savingsRate >= 20) {
    insights.push({ message: `Your savings rate is fantastic at ${overview.savingsRate}%.`, severity: 'INFO' });
  } else if (overview.savingsRate > 0 && overview.savingsRate < 10) {
    insights.push({ message: `Your savings rate is low (${overview.savingsRate}%). Try cutting back on non-essentials.`, severity: 'WARNING' });
  } else if (overview.savingsRate <= 0 && overview.totalExpenses > 0) {
    insights.push({ message: `You are spending more than you earn!`, severity: 'CRITICAL' });
  }

  if (spending.topExpenseCategory) {
    const pct = parseFloat(((spending.categoryBreakdown[0].amount / overview.totalExpenses) * 100).toFixed(1));
    insights.push({ message: `You spend ${pct}% of your total expenses on ${spending.topExpenseCategory}.`, severity: 'INFO' });
  }

  if (budgets.mostOverspentCategory && budgets.mostOverspentCategory.utilizationPercentage > 100) {
    insights.push({ message: `You exceeded your ${budgets.mostOverspentCategory.category} budget by ${budgets.mostOverspentCategory.utilizationPercentage - 100}%.`, severity: 'WARNING' });
  }

  // Recommendations
  if (overview.savingsRate < 20) {
    recommendations.push({ title: 'Boost Savings', description: 'Aim to save at least 20% of your monthly income.', priority: 'High' });
  }
  if (budgets.mostOverspentCategory && budgets.mostOverspentCategory.utilizationPercentage > 100) {
    recommendations.push({ title: `Reduce ${budgets.mostOverspentCategory.category} Spending`, description: `You consistently go over budget. Adjust your limits or track spending closer.`, priority: 'High' });
  }
  if (overview.expenseChangePercentage > 15) {
    recommendations.push({ title: 'Expense Spike Detected', description: 'Your expenses rose sharply this month. Review your transactions.', priority: 'Medium' });
  }
  if (recommendations.length === 0) {
    recommendations.push({ title: 'Keep it up!', description: 'Your finances look incredibly healthy right now.', priority: 'Low' });
  }

  return { insights, recommendations };
};

const getForecasting = async (userId) => {
  const overview = await getOverviewAnalytics(userId);
  const spending = await getSpendingAnalytics(userId);

  // Simple forecast models
  // Future Expense Forecast = average + trend impact
  let monthlyExpenseForecast = overview.averageMonthlyExpenses;
  let expenseConfidence = 60;
  
  if (spending.monthlyExpenseTrend.length >= 3) {
    expenseConfidence = 85;
    // Basic moving average of last 3 months
    const last3 = spending.monthlyExpenseTrend.slice(-3);
    const sum = last3.reduce((acc, curr) => acc + curr.amount, 0);
    monthlyExpenseForecast = sum / 3;
  }

  let monthlySavingsForecast = Math.max(0, overview.averageMonthlyIncome - monthlyExpenseForecast);
  let savingsConfidence = expenseConfidence;

  return {
    monthlyExpenseForecast: { forecastValue: parseFloat(monthlyExpenseForecast.toFixed(2)), confidence: expenseConfidence },
    monthlySavingsForecast: { forecastValue: parseFloat(monthlySavingsForecast.toFixed(2)), confidence: savingsConfidence },
  };
};

module.exports = {
  getOverviewAnalytics,
  getSpendingAnalytics,
  getIncomeAnalytics,
  getBudgetAnalytics,
  getGoalAnalytics,
  getFinancialHealth,
  getInsightsEngine,
  getForecasting
};
