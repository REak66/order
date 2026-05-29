const express = require('express');
const router = express.Router();
const staffPortalController = require('../controllers/staffPortalController');
const { staffAuthMiddleware } = require('../middleware/authMiddleware');

router.get('/my-order', staffAuthMiddleware, staffPortalController.getMyOrder);
router.post('/order', staffAuthMiddleware, staffPortalController.placeOrder);
router.post('/cancel', staffAuthMiddleware, staffPortalController.cancelOrder);
router.patch('/branch', staffAuthMiddleware, staffPortalController.updateBranch);
router.put('/change-password', staffAuthMiddleware, staffPortalController.changePassword);

module.exports = router;
