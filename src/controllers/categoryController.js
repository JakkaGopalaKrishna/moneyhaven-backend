const Category = require('../models/Category');
const Transaction = require('../models/Transaction');
const asyncHandler = require('../utils/asyncHandler');

// Helper to generate random hex color
const generateRandomColor = () => {
  return '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0');
};

// @desc    Create new category
// @route   POST /api/categories
// @access  Private
const createCategory = asyncHandler(async (req, res) => {
  const { name, type, icon, color } = req.body;

  if (!name || !type) {
    res.status(400);
    throw new Error('Please provide category name and type');
  }

  // Check if category name already exists for this user and type
  const categoryExists = await Category.findOne({
    userId: req.user._id,
    name: { $regex: new RegExp(`^${name}$`, 'i') },
    type,
    isActive: true
  });

  if (categoryExists) {
    res.status(400);
    throw new Error('Category already exists');
  }

  const category = await Category.create({
    userId: req.user._id,
    name,
    type,
    icon: icon || 'AppstoreOutlined',
    color: color || generateRandomColor(),
  });

  res.status(201).json({
    success: true,
    data: category,
  });
});

// @desc    Get all active categories with usage stats
// @route   GET /api/categories
// @access  Private
const getCategories = asyncHandler(async (req, res) => {
  const categories = await Category.aggregate([
    { $match: { userId: req.user._id, isActive: true } },
    {
      $lookup: {
        from: 'transactions',
        localField: '_id',
        foreignField: 'categoryId',
        as: 'transactions'
      }
    },
    {
      $project: {
        name: 1,
        type: 1,
        icon: 1,
        color: 1,
        isDefault: 1,
        isActive: 1,
        createdAt: 1,
        updatedAt: 1,
        transactionCount: {
          $size: {
            $filter: {
              input: "$transactions",
              as: "txn",
              cond: { $eq: ["$$txn.isDeleted", false] }
            }
          }
        },
        totalAmount: {
          $reduce: {
            input: {
              $filter: {
                input: "$transactions",
                as: "txn",
                cond: { $eq: ["$$txn.isDeleted", false] }
              }
            },
            initialValue: 0,
            in: { $add: ["$$value", "$$this.amount"] }
          }
        }
      }
    },
    { $sort: { type: 1, name: 1 } }
  ]);

  res.json({
    success: true,
    count: categories.length,
    data: categories,
  });
});

// @desc    Get single category
// @route   GET /api/categories/:id
// @access  Private
const getCategoryById = asyncHandler(async (req, res) => {
  const category = await Category.findOne({
    _id: req.params.id,
    userId: req.user._id,
    isActive: true
  });

  if (!category) {
    res.status(404);
    throw new Error('Category not found');
  }

  res.json({
    success: true,
    data: category,
  });
});

// @desc    Update category
// @route   PUT /api/categories/:id
// @access  Private
const updateCategory = asyncHandler(async (req, res) => {
  const category = await Category.findOne({
    _id: req.params.id,
    userId: req.user._id,
    isActive: true
  });

  if (!category) {
    res.status(404);
    throw new Error('Category not found');
  }

  const { name, icon, color } = req.body;

  // Prevent renaming default categories
  if (category.isDefault && name && name !== category.name) {
    res.status(400);
    throw new Error('Cannot rename default categories. You can only change their icon or color.');
  }

  // Check for name duplicates if name is changing
  if (name && name !== category.name) {
    const categoryExists = await Category.findOne({
      userId: req.user._id,
      name: { $regex: new RegExp(`^${name}$`, 'i') },
      type: category.type,
      isActive: true
    });

    if (categoryExists) {
      res.status(400);
      throw new Error('Another category with this name already exists');
    }
  }

  category.name = name || category.name;
  category.icon = icon || category.icon;
  category.color = color || category.color;

  const updatedCategory = await category.save();

  // If name changed, we DO NOT need to update previous transactions 
  // because we use `categoryId` for linking. The `categoryNameSnapshot` 
  // in old transactions will preserve the historical name intentionally!

  res.json({
    success: true,
    data: updatedCategory,
  });
});

// @desc    Delete (archive) category
// @route   DELETE /api/categories/:id
// @access  Private
const deleteCategory = asyncHandler(async (req, res) => {
  const category = await Category.findOne({
    _id: req.params.id,
    userId: req.user._id,
    isActive: true
  });

  if (!category) {
    res.status(404);
    throw new Error('Category not found');
  }

  if (category.isDefault) {
    res.status(400);
    throw new Error('Cannot delete default categories');
  }

  // Usage Validation
  const inUse = await Transaction.exists({
    categoryId: category._id,
    isDeleted: false
  });

  if (inUse) {
    res.status(400);
    throw new Error('Category is currently in use by active transactions. Please reassign them before deleting.');
  }

  // Archive (Soft delete)
  category.isActive = false;
  await category.save();

  res.json({
    success: true,
    message: 'Category archived successfully',
  });
});

// @desc    Get category statistics
// @route   GET /api/categories/stats
// @access  Private
const getCategoryStats = asyncHandler(async (req, res) => {
  const stats = await Category.aggregate([
    { $match: { userId: req.user._id } },
    {
      $group: {
        _id: null,
        totalCategories: { $sum: 1 },
        activeCategories: { $sum: { $cond: [{ $eq: ['$isActive', true] }, 1, 0] } },
        incomeCategories: { $sum: { $cond: [{ $and: [{ $eq: ['$type', 'income'] }, { $eq: ['$isActive', true] }] }, 1, 0] } },
        expenseCategories: { $sum: { $cond: [{ $and: [{ $eq: ['$type', 'expense'] }, { $eq: ['$isActive', true] }] }, 1, 0] } }
      }
    }
  ]);

  if (stats.length === 0) {
    return res.json({
      success: true,
      data: {
        totalCategories: 0,
        activeCategories: 0,
        incomeCategories: 0,
        expenseCategories: 0
      }
    });
  }

  res.json({
    success: true,
    data: stats[0]
  });
});

module.exports = {
  createCategory,
  getCategories,
  getCategoryById,
  updateCategory,
  deleteCategory,
  getCategoryStats,
};
