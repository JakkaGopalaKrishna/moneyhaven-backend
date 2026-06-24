const asyncHandler = require('../utils/asyncHandler');
const reportService = require('../services/reportService');

/**
 * Shared handler to parse filters
 */
const getFilters = (req) => {
  return {
    startDate: req.query.startDate,
    endDate: req.query.endDate,
    month: req.query.month,
    year: req.query.year,
    categoryId: req.query.categoryId,
    type: req.query.type,
  };
};

/**
 * Report Previews (JSON Data)
 */
const getPreview = asyncHandler(async (req, res) => {
  const { type } = req.params; // e.g., 'monthly', 'executive', etc.
  
  // Title case the type
  const reportType = type.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  const filters = getFilters(req);

  const data = await reportService.getReportData(req.user._id, reportType, filters);
  res.json({ success: true, data });
});

/**
 * Exports (Downloads)
 */
const exportReport = asyncHandler(async (req, res) => {
  const { format } = req.params;
  const { reportType } = req.query; // Passed from frontend as e.g., "Executive Summary"
  const filters = getFilters(req);

  if (!reportType) {
    res.status(400);
    throw new Error('Report type is required');
  }

  if (format === 'pdf') {
    await reportService.exportToPdf(req.user._id, reportType, filters, res);
  } else if (format === 'csv') {
    await reportService.exportToCsv(req.user._id, reportType, filters, res);
  } else if (format === 'excel') {
    await reportService.exportToExcel(req.user._id, reportType, filters, res);
  } else {
    res.status(400);
    throw new Error('Invalid export format');
  }
});

/**
 * Get History
 */
const getHistory = asyncHandler(async (req, res) => {
  const data = await reportService.getHistory(req.user._id);
  res.json({ success: true, data });
});

module.exports = {
  getPreview,
  exportReport,
  getHistory
};
