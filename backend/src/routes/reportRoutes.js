const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const authMiddleware = require('../middleware/authMiddleware');

router.get('/', authMiddleware, reportController.getLunchReports);
router.post('/manual-order', authMiddleware, reportController.upsertManualOrder);
router.get('/export/excel', authMiddleware, reportController.exportExcel);
router.get('/export/pdf', authMiddleware, reportController.exportPDF);

module.exports = router;
