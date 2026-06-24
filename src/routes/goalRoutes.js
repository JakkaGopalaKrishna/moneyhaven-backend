const express = require('express');
const router = express.Router();
const {
  createGoal,
  getGoals,
  getGoalById,
  updateGoal,
  deleteGoal,
  addContribution,
  getGoalProgress,
  getGoalStats,
  getGoalInsights,
} = require('../controllers/goalController');
const { protect } = require('../middleware/authMiddleware');

router.route('/progress').get(protect, getGoalProgress);
router.route('/stats').get(protect, getGoalStats);
router.route('/insights').get(protect, getGoalInsights);

router.route('/')
  .post(protect, createGoal)
  .get(protect, getGoals);

router.route('/:id')
  .get(protect, getGoalById)
  .put(protect, updateGoal)
  .delete(protect, deleteGoal);

router.route('/:id/contributions')
  .post(protect, addContribution);

module.exports = router;
