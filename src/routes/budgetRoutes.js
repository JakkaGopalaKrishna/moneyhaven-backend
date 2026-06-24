const express = require('express');
const router = express.Router();
const {
  createBudget,
  getBudgets,
  getBudgetById,
  updateBudget,
  deleteBudget,
  getBudgetProgress,
  getBudgetHistory,
  getBudgetStats,
} = require('../controllers/budgetController');
const { protect } = require('../middleware/authMiddleware');

router.route('/progress').get(protect, getBudgetProgress);
router.route('/stats').get(protect, getBudgetStats);
router.route('/history').get(protect, getBudgetHistory);

router.route('/')
  .post(protect, createBudget)
  .get(protect, getBudgets);

router.route('/:id')
  .get(protect, getBudgetById)
  .put(protect, updateBudget)
  .delete(protect, deleteBudget);

module.exports = router;
