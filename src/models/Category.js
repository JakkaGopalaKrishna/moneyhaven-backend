const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: [2, 'Category name must be at least 2 characters long'],
    },
    type: {
      type: String,
      enum: ['income', 'expense'],
      required: true,
    },
    icon: {
      type: String,
      default: 'AppstoreOutlined',
    },
    color: {
      type: String,
      default: '#1677ff',
    },
    isDefault: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Ensure a user cannot have duplicate category names for the same type
categorySchema.index({ userId: 1, name: 1, type: 1 }, { unique: true });

const Category = mongoose.model('Category', categorySchema);

module.exports = Category;
