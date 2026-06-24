const express = require('express');
const router = express.Router();
const {
  getSchedules,
  createSchedule,
  updateSchedule,
  deleteSchedule,
  getHealth
} = require('../controllers/reportScheduleController');
const { protect } = require('../middleware/authMiddleware');

router.get('/health', getHealth); // Could be admin protected in future

router.use(protect);

router.route('/')
  .get(getSchedules)
  .post(createSchedule);

router.route('/:id')
  .put(updateSchedule)
  .delete(deleteSchedule);

module.exports = router;
