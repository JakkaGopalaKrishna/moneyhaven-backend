const express = require('express');
const router = express.Router();
const { getPreview, exportReport, getHistory } = require('../controllers/reportController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.get('/history', getHistory);
router.get('/export/:format', exportReport); // format = pdf | csv | excel
router.get('/:type', getPreview); // type = monthly | yearly | executive-summary | transactions | budgets | goals | analytics

module.exports = router;
