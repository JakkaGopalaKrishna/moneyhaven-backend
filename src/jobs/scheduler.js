const cron = require('node-cron');
const dayjs = require('dayjs');
const SavingsGoal = require('../models/SavingsGoal');
const ReportSchedule = require('../models/ReportSchedule');
const ReportExecutionLog = require('../models/ReportExecutionLog');
const User = require('../models/User');
const notificationService = require('../services/notificationService');
const reportService = require('../services/reportService');
const analyticsService = require('../services/analyticsService');

/**
 * Daily Job (Runs at 00:00 every day)
 * - Checks Goal Deadlines
 * - Checks Financial Health Score
 */
cron.schedule('0 0 * * *', async () => {
  console.log('Running Daily Scheduler Tasks...');
  try {
    const users = await User.find({});
    
    for (const user of users) {
      const userId = user._id;

      // 1. Goal Reminders
      const activeGoals = await SavingsGoal.find({ userId, status: 'Active', isArchived: false });
      for (const goal of activeGoals) {
        if (!goal.targetDate) continue;
        
        const daysLeft = dayjs(goal.targetDate).diff(dayjs(), 'day');
        if ([30, 14, 7, 1].includes(daysLeft)) {
          // Send reminder notification
          await notificationService.createNotification({
            userId,
            title: 'Goal Deadline Approaching',
            message: `You have ${daysLeft} days left to reach your goal: ${goal.title}. Keep saving!`,
            type: 'Goal Alert',
            severity: daysLeft <= 7 ? 'Warning' : 'Info',
            priority: daysLeft <= 7 ? 'High' : 'Medium',
            relatedEntityType: 'Goal',
            relatedEntityId: goal._id,
            actionUrl: '/goals'
          });
        }
      }

      // 2. Financial Health Alert
      const analytics = await analyticsService.getOverviewAnalytics(userId);
      const healthScore = analytics.healthScore || 0;
      
      if (healthScore < 50) {
        // Send critical health alert (deduplicate by checking existing this month)
        const startOfMonth = dayjs().startOf('month').toDate();
        const existingHealthAlert = await require('../models/Notification').findOne({
          userId,
          type: 'Financial Health Alert',
          createdAt: { $gte: startOfMonth }
        });

        if (!existingHealthAlert) {
          await notificationService.createNotification({
            userId,
            title: 'Financial Health Warning',
            message: `Your financial health score has dropped to ${healthScore}/100. Consider reviewing your budget.`,
            type: 'Financial Health Alert',
            severity: 'Critical',
            priority: 'Critical',
            relatedEntityType: 'System',
            actionUrl: '/analytics',
            expiresAt: dayjs().endOf('month').toDate()
          });
        }
      }
    }
  } catch (err) {
    console.error('Error in Daily Scheduler:', err);
  }
});

/**
 * Minutely Job (Runs every minute)
 * - Checks Scheduled Reports
 */
cron.schedule('* * * * *', async () => {
  try {
    const now = new Date();
    // Find active schedules that are due
    const dueSchedules = await ReportSchedule.find({
      isActive: true,
      nextRunAt: { $lte: now }
    });

    for (const schedule of dueSchedules) {
      let attempts = 0;
      const maxAttempts = 3;
      let success = false;
      let lastError = null;

      while (attempts < maxAttempts && !success) {
        try {
          // Generate report data directly (Simulated generation, since we don't have a file stream available without a Response object)
          // In a real scenario, this would generate the file to S3 or a local temp directory and email it.
          // For MVP, we "generate" it by simply updating the history to signify it ran, and alerting the user.
          
          const filters = {
             startDate: dayjs().subtract(1, 'month').format('YYYY-MM-DD'),
             endDate: dayjs().format('YYYY-MM-DD')
          };
          
          // Actually getting the data verifies it works without crashing
          await reportService.getReportData(schedule.userId, schedule.reportType, filters);
          
          // Log History for Audit (similar to what happens in exportTo...)
          await require('../models/ReportHistory').create({
            userId: schedule.userId,
            reportType: schedule.reportType,
            format: schedule.format,
            filters,
            fileName: `MoneyHaven_Scheduled_${schedule.reportType.replace(/\\s+/g, '_')}_${dayjs().format('YYYY-MM-DD')}.${schedule.format.toLowerCase()}`,
            generatedAt: new Date()
          });

          success = true;
        } catch (err) {
          attempts++;
          lastError = err.message;
          console.error(`Scheduled Report Failed (Attempt ${attempts}):`, err.message);
        }
      }

      // Log Execution
      await ReportExecutionLog.create({
        scheduleId: schedule._id,
        status: success ? 'Success' : 'Failed',
        errorMessage: success ? null : lastError
      });

      if (success) {
        // Send Notification
        await notificationService.createNotification({
          userId: schedule.userId,
          title: 'Scheduled Report Ready',
          message: `Your automated ${schedule.reportType} report is ready. You can view it in your Report History.`,
          type: 'Report Generated',
          severity: 'Success',
          priority: 'Low',
          relatedEntityType: 'Report',
          actionUrl: '/reports'
        });

        // Update Next Run Date
        schedule.lastRunAt = new Date();
        
        const nextDate = dayjs(schedule.nextRunAt);
        switch (schedule.frequency) {
          case 'Weekly': schedule.nextRunAt = nextDate.add(1, 'week').toDate(); break;
          case 'Monthly': schedule.nextRunAt = nextDate.add(1, 'month').toDate(); break;
          case 'Quarterly': schedule.nextRunAt = nextDate.add(3, 'month').toDate(); break;
          case 'Yearly': schedule.nextRunAt = nextDate.add(1, 'year').toDate(); break;
        }
        await schedule.save();
      } else {
        // Send Failure Notification
        await notificationService.createNotification({
          userId: schedule.userId,
          title: 'Scheduled Report Failed',
          message: `Your automated ${schedule.reportType} report failed to generate after 3 attempts.`,
          type: 'System Notification',
          severity: 'Critical',
          priority: 'High',
          actionUrl: '/reports'
        });
        
        // Deactivate schedule temporarily to avoid infinite failure loops
        schedule.isActive = false;
        await schedule.save();
      }
    }
  } catch (err) {
    console.error('Error in Minutely Scheduler:', err);
  }
});
