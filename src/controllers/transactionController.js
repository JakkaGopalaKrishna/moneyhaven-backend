const Transaction = require('../models/Transaction');
const asyncHandler = require('../utils/asyncHandler');

// @desc    Create new transaction
// @route   POST /api/transactions
// @access  Private
const createTransaction = asyncHandler(async (req, res) => {
  const { title, amount, type, category, paymentMethod, description, transactionDate } = req.body;

  // Basic validation
  if (!title || !amount || !type || !category || !transactionDate) {
    res.status(400);
    throw new Error('Please provide all required fields');
  }

  if (amount <= 0) {
    res.status(400);
    throw new Error('Amount must be greater than zero');
  }

  if (new Date(transactionDate) > new Date()) {
    res.status(400);
    throw new Error('Transaction date cannot be in the future');
  }

  const transaction = await Transaction.create({
    userId: req.user._id,
    title,
    amount,
    type,
    category,
    paymentMethod,
    description,
    transactionDate,
  });

  res.status(201).json({
    success: true,
    data: transaction,
  });
});

// @desc    Get all transactions (with filtering, sorting, pagination)
// @route   GET /api/transactions
// @access  Private
const getTransactions = asyncHandler(async (req, res) => {
  const { 
    type, 
    category, 
    search, 
    startDate, 
    endDate, 
    minAmount, 
    maxAmount,
    page = 1,
    limit = 10,
    sort = 'newest'
  } = req.query;

  // Build query
  const query = { userId: req.user._id, isDeleted: false };

  if (type) query.type = type;
  if (category) query.category = category;
  
  if (search) {
    query.title = { $regex: search, $options: 'i' };
  }

  // Date range
  if (startDate || endDate) {
    query.transactionDate = {};
    if (startDate) query.transactionDate.$gte = new Date(startDate);
    if (endDate) query.transactionDate.$lte = new Date(endDate);
  }

  // Amount range
  if (minAmount || maxAmount) {
    query.amount = {};
    if (minAmount) query.amount.$gte = Number(minAmount);
    if (maxAmount) query.amount.$lte = Number(maxAmount);
  }

  // Sorting logic
  let sortObj = {};
  switch (sort) {
    case 'oldest':
      sortObj = { transactionDate: 1 };
      break;
    case 'highest':
      sortObj = { amount: -1 };
      break;
    case 'lowest':
      sortObj = { amount: 1 };
      break;
    case 'newest':
    default:
      sortObj = { transactionDate: -1 };
      break;
  }

  // Pagination logic
  const pageNum = parseInt(page, 10);
  const limitNum = parseInt(limit, 10);
  const skip = (pageNum - 1) * limitNum;

  const total = await Transaction.countDocuments(query);
  const transactions = await Transaction.find(query)
    .sort(sortObj)
    .skip(skip)
    .limit(limitNum);

  res.json({
    success: true,
    count: transactions.length,
    total,
    page: pageNum,
    pages: Math.ceil(total / limitNum),
    data: transactions,
  });
});

// @desc    Get single transaction
// @route   GET /api/transactions/:id
// @access  Private
const getTransactionById = asyncHandler(async (req, res) => {
  const transaction = await Transaction.findOne({
    _id: req.params.id,
    userId: req.user._id,
    isDeleted: false
  });

  if (!transaction) {
    res.status(404);
    throw new Error('Transaction not found');
  }

  res.json({
    success: true,
    data: transaction,
  });
});

// @desc    Update transaction
// @route   PUT /api/transactions/:id
// @access  Private
const updateTransaction = asyncHandler(async (req, res) => {
  const transaction = await Transaction.findOne({
    _id: req.params.id,
    userId: req.user._id,
    isDeleted: false
  });

  if (!transaction) {
    res.status(404);
    throw new Error('Transaction not found');
  }

  const { title, amount, type, category, paymentMethod, description, transactionDate } = req.body;

  if (amount && amount <= 0) {
    res.status(400);
    throw new Error('Amount must be greater than zero');
  }

  if (transactionDate && new Date(transactionDate) > new Date()) {
    res.status(400);
    throw new Error('Transaction date cannot be in the future');
  }

  transaction.title = title || transaction.title;
  transaction.amount = amount || transaction.amount;
  transaction.type = type || transaction.type;
  transaction.category = category || transaction.category;
  transaction.paymentMethod = paymentMethod || transaction.paymentMethod;
  transaction.description = description !== undefined ? description : transaction.description;
  transaction.transactionDate = transactionDate || transaction.transactionDate;

  const updatedTransaction = await transaction.save();

  res.json({
    success: true,
    data: updatedTransaction,
  });
});

// @desc    Delete transaction (Soft Delete)
// @route   DELETE /api/transactions/:id
// @access  Private
const deleteTransaction = asyncHandler(async (req, res) => {
  const transaction = await Transaction.findOne({
    _id: req.params.id,
    userId: req.user._id,
    isDeleted: false
  });

  if (!transaction) {
    res.status(404);
    throw new Error('Transaction not found');
  }

  transaction.isDeleted = true;
  await transaction.save();

  res.json({
    success: true,
    message: 'Transaction deleted successfully',
  });
});

// @desc    Get transaction statistics
// @route   GET /api/transactions/stats
// @access  Private
const getTransactionStats = asyncHandler(async (req, res) => {
  const query = { userId: req.user._id, isDeleted: false };
  
  const stats = await Transaction.aggregate([
    { $match: query },
    {
      $group: {
        _id: null,
        totalTransactions: { $sum: 1 },
        incomeCount: {
          $sum: { $cond: [{ $eq: ['$type', 'income'] }, 1, 0] }
        },
        expenseCount: {
          $sum: { $cond: [{ $eq: ['$type', 'expense'] }, 1, 0] }
        },
        highestIncome: {
          $max: { $cond: [{ $eq: ['$type', 'income'] }, '$amount', 0] }
        },
        highestExpense: {
          $max: { $cond: [{ $eq: ['$type', 'expense'] }, '$amount', 0] }
        }
      }
    }
  ]);

  if (stats.length === 0) {
    return res.json({
      success: true,
      data: {
        totalTransactions: 0,
        incomeCount: 0,
        expenseCount: 0,
        highestIncome: 0,
        highestExpense: 0
      }
    });
  }

  res.json({
    success: true,
    data: stats[0],
  });
});

module.exports = {
  createTransaction,
  getTransactions,
  getTransactionById,
  updateTransaction,
  deleteTransaction,
  getTransactionStats,
};
