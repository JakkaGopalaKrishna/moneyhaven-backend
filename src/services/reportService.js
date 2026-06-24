const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');
const { Parser } = require('json2csv');
const dayjs = require('dayjs');
const mongoose = require('mongoose');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const Category = require('../models/Category');
const Budget = require('../models/Budget');
const SavingsGoal = require('../models/SavingsGoal');
const ReportHistory = require('../models/ReportHistory');
const analyticsService = require('./analyticsService');

/**
 * Standardized Date Range Filter Builder
 */
const buildDateFilter = (filters) => {
  const { startDate, endDate, month, year } = filters;
  const match = { isDeleted: false };
  
  if (startDate && endDate) {
    match.transactionDate = { 
      $gte: new Date(startDate), 
      $lte: dayjs(endDate).endOf('day').toDate() 
    };
  } else if (month && year) {
    const start = dayjs().year(year).month(month - 1).startOf('month');
    const end = start.endOf('month');
    match.transactionDate = { $gte: start.toDate(), $lte: end.toDate() };
  } else if (year) {
    const start = dayjs().year(year).startOf('year');
    const end = start.endOf('year');
    match.transactionDate = { $gte: start.toDate(), $lte: end.toDate() };
  }
  
  return match;
};

/**
 * Fetch Unified Report Data
 */
const getReportData = async (userId, reportType, filters) => {
  const dateMatch = buildDateFilter(filters);
  const matchObj = { userId: new mongoose.Types.ObjectId(userId), ...dateMatch };

  if (filters.categoryId) matchObj.categoryId = new mongoose.Types.ObjectId(filters.categoryId);
  if (filters.type) matchObj.type = filters.type;

  // Fetch Transactions
  const transactions = await Transaction.find(matchObj).populate('categoryId').sort({ transactionDate: -1 }).lean();

  let totalIncome = 0;
  let totalExpenses = 0;

  const formattedTransactions = transactions.map(t => {
    if (t.type === 'income') totalIncome += t.amount;
    else totalExpenses += t.amount;

    return {
      date: dayjs(t.transactionDate).format('YYYY-MM-DD'),
      type: t.type,
      category: t.categoryId ? t.categoryId.name : 'Unknown',
      amount: t.amount,
      paymentMethod: t.paymentMethod || 'Unknown',
      notes: t.notes || ''
    };
  });

  const netSavings = totalIncome - totalExpenses;
  const transactionCount = transactions.length;

  // Executive Summary Specific Data
  let healthScore = null;
  let budgetHealth = null;
  let goalProgress = null;

  if (reportType === 'Executive Summary') {
    const healthData = await analyticsService.getFinancialHealth(userId);
    const budgetsData = await analyticsService.getBudgetAnalytics(userId);
    const goalsData = await analyticsService.getGoalAnalytics(userId);

    healthScore = healthData.score;
    budgetHealth = budgetsData.budgetUtilization;
    goalProgress = goalsData;
  }

  return {
    reportType,
    generatedAt: new Date(),
    dateRange: filters,
    totalRecords: transactionCount,
    totalIncome,
    totalExpenses,
    netSavings,
    transactions: formattedTransactions,
    healthScore,
    budgetHealth,
    goalProgress
  };
};

/**
 * Log Report History (Audit Trail)
 */
const logReportHistory = async (userId, reportType, format, filters, fileName) => {
  await ReportHistory.create({
    userId,
    reportType,
    format,
    filters,
    fileName,
    generatedAt: new Date()
  });
};

/**
 * EXPORT TO PDF
 */
const exportToPdf = async (userId, reportType, filters, res) => {
  const user = await User.findById(userId);
  const data = await getReportData(userId, reportType, filters);
  
  const fileName = `MoneyHaven_${reportType.replace(/\s+/g, '_')}_${dayjs().format('YYYY-MM-DD')}.pdf`;

  // Start PDF Document
  const doc = new PDFDocument({ margin: 50 });
  
  res.setHeader('Content-disposition', `attachment; filename="${fileName}"`);
  res.setHeader('Content-type', 'application/pdf');
  doc.pipe(res);

  // Cover Page
  doc.fontSize(24).fillColor('#1677ff').text('MoneyHaven', { align: 'center' });
  doc.moveDown(0.5);
  doc.fontSize(16).fillColor('#333333').text(`${reportType} Report`, { align: 'center' });
  doc.moveDown(2);
  
  doc.fontSize(12).fillColor('#555555');
  doc.text(`Generated For: ${user.name} (${user.email})`, { align: 'center' });
  doc.text(`Generated Date: ${dayjs().format('MMMM D, YYYY')}`, { align: 'center' });
  if (filters.startDate && filters.endDate) {
    doc.text(`Reporting Period: ${dayjs(filters.startDate).format('MMM D, YYYY')} to ${dayjs(filters.endDate).format('MMM D, YYYY')}`, { align: 'center' });
  }

  doc.moveDown(4);

  // Financial Summary
  doc.fontSize(18).fillColor('#1677ff').text('Financial Statistics', { underline: true });
  doc.moveDown(1);
  doc.fontSize(12).fillColor('#000000');
  
  doc.text(`Total Transactions: ${data.totalRecords}`);
  doc.text(`Total Income: ₹${data.totalIncome}`);
  doc.text(`Total Expenses: ₹${data.totalExpenses}`);
  doc.fillColor(data.netSavings >= 0 ? '#52c41a' : '#f5222d').text(`Net Savings: ₹${data.netSavings}`);
  doc.fillColor('#000000');

  // Executive Summary Extras
  if (reportType === 'Executive Summary') {
    doc.moveDown(2);
    doc.fontSize(18).fillColor('#1677ff').text('Health & Goals', { underline: true });
    doc.moveDown(1);
    doc.fontSize(12).fillColor('#000000');
    doc.text(`Financial Health Score: ${data.healthScore} / 100`);
    doc.text(`Active Goals: ${data.goalProgress.activeGoals}`);
    doc.text(`Completed Goals: ${data.goalProgress.completedGoals}`);
    doc.text(`Goal Achievement Rate: ${data.goalProgress.achievementRate}%`);
  }

  doc.addPage();

  // Transactions Table Header
  doc.fontSize(18).fillColor('#1677ff').text('Transaction Details', { underline: true });
  doc.moveDown(1);

  doc.fontSize(10).fillColor('#000000');
  const tableTop = 150;
  doc.font('Helvetica-Bold');
  doc.text('Date', 50, tableTop);
  doc.text('Type', 150, tableTop);
  doc.text('Category', 250, tableTop);
  doc.text('Amount', 350, tableTop);
  doc.text('Payment', 450, tableTop);
  
  doc.font('Helvetica');
  let yPosition = tableTop + 20;

  // Transaction Rows (Limit to 100 in PDF to prevent massive files, use CSV/Excel for full exports)
  const maxPdfRows = Math.min(data.transactions.length, 100);
  
  for (let i = 0; i < maxPdfRows; i++) {
    const row = data.transactions[i];
    
    // Add page if needed
    if (yPosition > 700) {
      doc.addPage();
      yPosition = 50;
    }

    doc.text(row.date, 50, yPosition);
    doc.fillColor(row.type === 'income' ? '#52c41a' : '#f5222d').text(row.type, 150, yPosition);
    doc.fillColor('#000000').text(row.category, 250, yPosition);
    doc.text(`₹${row.amount}`, 350, yPosition);
    doc.text(row.paymentMethod, 450, yPosition);

    yPosition += 20;
  }

  if (data.transactions.length > 100) {
    doc.moveDown(2);
    doc.font('Helvetica-Oblique').text(`... and ${data.transactions.length - 100} more transactions. Export to Excel or CSV for the full list.`);
  }

  // Footer
  const pages = doc.bufferedPageRange();
  for (let i = 0; i < pages.count; i++) {
    doc.switchToPage(i);
    doc.fontSize(8).fillColor('#aaaaaa').text(
      `Generated by MoneyHaven | Page ${i + 1} of ${pages.count}`,
      50,
      doc.page.height - 50,
      { align: 'center' }
    );
  }

  doc.end();

  // Audit
  await logReportHistory(userId, reportType, 'PDF', filters, fileName);
};

/**
 * EXPORT TO EXCEL
 */
const exportToExcel = async (userId, reportType, filters, res) => {
  const data = await getReportData(userId, reportType, filters);
  const fileName = `MoneyHaven_${reportType.replace(/\s+/g, '_')}_${dayjs().format('YYYY-MM-DD')}.xlsx`;

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'MoneyHaven';

  // 1. Summary Sheet
  const summarySheet = workbook.addWorksheet('Summary');
  summarySheet.columns = [
    { header: 'Metric', key: 'metric', width: 30 },
    { header: 'Value', key: 'value', width: 20 },
  ];
  
  summarySheet.addRow({ metric: 'Report Type', value: reportType });
  summarySheet.addRow({ metric: 'Generated Date', value: dayjs().format('YYYY-MM-DD HH:mm') });
  summarySheet.addRow({ metric: 'Total Records', value: data.totalRecords });
  summarySheet.addRow({ metric: 'Total Income', value: data.totalIncome });
  summarySheet.addRow({ metric: 'Total Expenses', value: data.totalExpenses });
  summarySheet.addRow({ metric: 'Net Savings', value: data.netSavings });

  if (reportType === 'Executive Summary') {
    summarySheet.addRow({ metric: 'Financial Health Score', value: data.healthScore });
    summarySheet.addRow({ metric: 'Active Goals', value: data.goalProgress?.activeGoals });
    summarySheet.addRow({ metric: 'Goal Achievement Rate (%)', value: data.goalProgress?.achievementRate });
  }

  // Formatting Summary
  summarySheet.getRow(1).font = { bold: true };
  summarySheet.getColumn(2).numFmt = '₹#,##0.00'; // currency format

  // 2. Transactions Sheet
  const txSheet = workbook.addWorksheet('Transactions');
  txSheet.columns = [
    { header: 'Date', key: 'date', width: 15 },
    { header: 'Type', key: 'type', width: 10 },
    { header: 'Category', key: 'category', width: 20 },
    { header: 'Amount', key: 'amount', width: 15 },
    { header: 'Payment Method', key: 'paymentMethod', width: 15 },
    { header: 'Notes', key: 'notes', width: 40 },
  ];
  
  txSheet.getRow(1).font = { bold: true };
  txSheet.addRows(data.transactions);
  txSheet.getColumn('amount').numFmt = '₹#,##0.00';

  // Output
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename=${fileName}`);
  
  await workbook.xlsx.write(res);
  res.end();

  // Audit
  await logReportHistory(userId, reportType, 'Excel', filters, fileName);
};

/**
 * EXPORT TO CSV (Streaming approach for memory optimization)
 */
const exportToCsv = async (userId, reportType, filters, res) => {
  const data = await getReportData(userId, reportType, filters);
  const fileName = `MoneyHaven_${reportType.replace(/\s+/g, '_')}_${dayjs().format('YYYY-MM-DD')}.csv`;

  // Human Readable Headers
  const fields = [
    { label: 'Transaction Date', value: 'date' },
    { label: 'Transaction Type', value: 'type' },
    { label: 'Category Name', value: 'category' },
    { label: 'Amount (INR)', value: 'amount' },
    { label: 'Payment Method', value: 'paymentMethod' },
    { label: 'Description/Notes', value: 'notes' }
  ];

  const json2csvParser = new Parser({ fields });
  const csvString = json2csvParser.parse(data.transactions);

  res.setHeader('Content-disposition', `attachment; filename=${fileName}`);
  res.set('Content-Type', 'text/csv');
  res.status(200).send(csvString);

  // Audit
  await logReportHistory(userId, reportType, 'CSV', filters, fileName);
};

const getHistory = async (userId) => {
  return await ReportHistory.find({ userId }).sort({ generatedAt: -1 }).limit(50);
};

module.exports = {
  getReportData,
  exportToPdf,
  exportToExcel,
  exportToCsv,
  getHistory
};
