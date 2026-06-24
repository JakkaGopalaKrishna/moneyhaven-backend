const Notification = require('../models/Notification');
const NotificationPreference = require('../models/NotificationPreference');
const Budget = require('../models/Budget');
const SavingsGoal = require('../models/SavingsGoal');
const analyticsService = require('./analyticsService');
const dayjs = require('dayjs');

// Helper to check preferences
const checkPreference = async (userId, preferenceKey) => {
  let prefs = await NotificationPreference.findOne({ userId });
  if (!prefs) {
    prefs = await NotificationPreference.create({ userId });
  }
  return prefs[preferenceKey];
};

/**
 * Core Notification Creator
 */
const createNotification = async ({
  userId, title, message, type, severity = 'Info', priority = 'Medium',
  relatedEntityType = null, relatedEntityId = null, actionUrl = null, expiresAt = null
}) => {
  // Respect preferences based on type
  if (type === 'Budget Alert' && !(await checkPreference(userId, 'budgetAlerts'))) return null;
  if ((type === 'Goal Alert' || type === 'Goal Completed') && !(await checkPreference(userId, 'goalAlerts'))) return null;
  if (type === 'Report Generated' && !(await checkPreference(userId, 'reportNotifications'))) return null;
  if (type === 'Financial Health Alert' && !(await checkPreference(userId, 'financialHealthAlerts'))) return null;

  return await Notification.create({
    userId, title, message, type, severity, priority,
    relatedEntityType, relatedEntityId, actionUrl, expiresAt
  });
};

/**
 * Triggered after adding an expense transaction
 */
const checkBudgetAlerts = async (userId, categoryId) => {
  const currentMonth = dayjs().month() + 1;
  const currentYear = dayjs().year();

  const budget = await Budget.findOne({ userId, categoryId, month: currentMonth, year: currentYear }).populate('categoryId');
  if (!budget) return;

  const analytics = await analyticsService.getBudgetAnalytics(userId);
  const budgetData = analytics.budgetUtilization.find(b => b.category === budget.categoryId.name);
  
  if (!budgetData) return;

  const utilization = budgetData.utilizationPercentage;
  const threshold = budget.alertThreshold || 80;

  if (utilization >= threshold) {
    // Deduplication check: Has an alert been sent for this budget this month?
    const startOfMonth = dayjs().startOf('month').toDate();
    const existingAlert = await Notification.findOne({
      userId,
      type: 'Budget Alert',
      relatedEntityId: budget._id,
      createdAt: { $gte: startOfMonth }
    });

    if (existingAlert) {
      // If we already sent a warning, maybe we send a critical if > 100% and existing is warning?
      if (utilization >= 100 && existingAlert.severity !== 'Critical') {
        await createNotification({
          userId,
          title: 'Budget Exceeded',
          message: `You have exceeded your ${budget.categoryId.name} budget for this month. (${utilization}%)`,
          type: 'Budget Alert',
          severity: 'Critical',
          priority: 'High',
          relatedEntityType: 'Budget',
          relatedEntityId: budget._id,
          actionUrl: '/budgets',
          expiresAt: dayjs().endOf('month').toDate()
        });
      }
      return;
    }

    // Generate new warning
    await createNotification({
      userId,
      title: 'Budget Warning',
      message: `You have reached ${utilization}% of your ${budget.categoryId.name} budget.`,
      type: 'Budget Alert',
      severity: 'Warning',
      priority: 'Medium',
      relatedEntityType: 'Budget',
      relatedEntityId: budget._id,
      actionUrl: '/budgets',
      expiresAt: dayjs().endOf('month').toDate()
    });
  }
};

/**
 * Triggered after adding a goal contribution
 */
const checkGoalCompletion = async (userId, goalId) => {
  const goal = await SavingsGoal.findOne({ _id: goalId, userId });
  if (!goal) return;

  if (goal.savedAmount >= goal.targetAmount && goal.status !== 'Completed') {
    goal.status = 'Completed';
    goal.completedAt = new Date();
    await goal.save();

    await createNotification({
      userId,
      title: 'Goal Completed! 🎉',
      message: `Congratulations! You have successfully reached your savings goal: ${goal.title}.`,
      type: 'Goal Completed',
      severity: 'Success',
      priority: 'High',
      relatedEntityType: 'Goal',
      relatedEntityId: goal._id,
      actionUrl: '/goals'
    });
  }
};

module.exports = {
  checkPreference,
  createNotification,
  checkBudgetAlerts,
  checkGoalCompletion
};
