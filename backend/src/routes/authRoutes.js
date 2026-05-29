const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const authMiddleware = require('../middleware/authMiddleware');
const { staffAuthMiddleware } = require('../middleware/authMiddleware');

router.post('/login', authController.login);
router.get('/me', authMiddleware, authController.getMe);
router.get('/admins', authMiddleware, authController.getAdmins);
router.post('/change-password', authMiddleware, authController.changePassword);

// Staff login, register & me
router.post('/staff-login', authController.staffLogin);
router.get('/staff-me', staffAuthMiddleware, authController.getStaffMe);

module.exports = router;
