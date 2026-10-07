const express = require('express');
const router = express.Router();
const holidayController = require('../controllers/holidayController');
const authMiddleware = require('../middleware/authMiddleware');

router.get('/', authMiddleware, holidayController.getAllHolidays);
router.post('/', authMiddleware, holidayController.createHoliday);
router.post('/seed-cambodia-2026', authMiddleware, holidayController.seedCambodia2026);
router.put('/:id', authMiddleware, holidayController.updateHoliday);
router.delete('/:id', authMiddleware, holidayController.deleteHoliday);

module.exports = router;
