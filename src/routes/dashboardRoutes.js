const express = require('express');
const { getDashboardSummary, getDashboardStats } = require('../controllers/dashboardController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.route('/summary').get(protect, getDashboardSummary);
router.route('/stats').get(protect, getDashboardStats);

module.exports = router;
