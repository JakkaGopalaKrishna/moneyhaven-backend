const asyncHandler = require('../utils/asyncHandler');
const ReportSchedule = require('../models/ReportSchedule');
const ReportExecutionLog = require('../models/ReportExecutionLog');
const dayjs = require('dayjs');

// Helper to calc next run
const calculateNextRun = (frequency) => {
  const now = dayjs();
  switch (frequency) {
    case 'Weekly': return now.add(1, 'week').toDate();
    case 'Monthly': return now.add(1, 'month').toDate();
    case 'Quarterly': return now.add(3, 'month').toDate();
    case 'Yearly': return now.add(1, 'year').toDate();
    default: return now.add(1, 'month').toDate();
  }
};

// @desc    Get schedules
// @route   GET /api/schedules
const getSchedules = asyncHandler(async (req, res) => {
  const schedules = await ReportSchedule.find({ userId: req.user._id }).sort({ createdAt: -1 });
  res.json({ success: true, data: schedules });
});

// @desc    Create schedule
// @route   POST /api/schedules
const createSchedule = asyncHandler(async (req, res) => {
  const { reportType, frequency, format, email } = req.body;

  const schedule = await ReportSchedule.create({
    userId: req.user._id,
    reportType,
    frequency,
    format,
    email,
    nextRunAt: calculateNextRun(frequency),
  });

  res.status(201).json({ success: true, data: schedule });
});

// @desc    Update schedule
// @route   PUT /api/schedules/:id
const updateSchedule = asyncHandler(async (req, res) => {
  const { isActive, frequency } = req.body;
  const updateData = { ...req.body };
  
  if (frequency) {
    updateData.nextRunAt = calculateNextRun(frequency);
  }

  const schedule = await ReportSchedule.findOneAndUpdate(
    { _id: req.params.id, userId: req.user._id },
    updateData,
    { new: true }
  );

  if (!schedule) {
    res.status(404);
    throw new Error('Schedule not found');
  }

  res.json({ success: true, data: schedule });
});

// @desc    Delete schedule
// @route   DELETE /api/schedules/:id
const deleteSchedule = asyncHandler(async (req, res) => {
  const schedule = await ReportSchedule.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
  if (!schedule) {
    res.status(404);
    throw new Error('Schedule not found');
  }
  res.json({ success: true, message: 'Schedule deleted' });
});

// @desc    Get scheduler health (For admin/monitoring)
// @route   GET /api/schedules/health
const getHealth = asyncHandler(async (req, res) => {
  const lastLog = await ReportExecutionLog.findOne().sort({ executedAt: -1 });
  const successfulJobs = await ReportExecutionLog.countDocuments({ status: 'Success' });
  const failedJobs = await ReportExecutionLog.countDocuments({ status: 'Failed' });

  res.json({
    success: true,
    data: {
      lastRun: lastLog ? lastLog.executedAt : null,
      successfulJobs,
      failedJobs
    }
  });
});

module.exports = {
  getSchedules,
  createSchedule,
  updateSchedule,
  deleteSchedule,
  getHealth
};
