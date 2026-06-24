const express = require('express');
const router = express.Router();
const {
  getOverview,
  getSpending,
  getIncome,
  getBudgets,
  getGoals,
  getHealth,
  getInsights,
  getForecast,
} = require('../controllers/analyticsController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.get('/overview', getOverview);
router.get('/spending', getSpending);
router.get('/income', getIncome);
router.get('/budgets', getBudgets);
router.get('/goals', getGoals);
router.get('/health', getHealth);
router.get('/insights', getInsights);
router.get('/forecast', getForecast);

module.exports = router;
