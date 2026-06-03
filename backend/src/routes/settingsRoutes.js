const express = require('express');
const router = express.Router();
const settingsController = require('../controllers/settingsController');
const authMiddleware = require('../middleware/authMiddleware');

router.get('/', authMiddleware, settingsController.getSettings);
router.post('/', authMiddleware, settingsController.updateSettings);
router.post('/send-now', authMiddleware, settingsController.sendReportNow);
router.post('/send-to-supply', authMiddleware, settingsController.sendToSupply);

module.exports = router;
