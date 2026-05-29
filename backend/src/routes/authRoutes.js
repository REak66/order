const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const authMiddleware = require('../middleware/authMiddleware');
const { staffAuthMiddleware } = require('../middleware/authMiddleware');

router.post('/login', authController.login);
router.get('/me', authMiddleware, authController.getMe);

// Staff login, register & me
router.post('/staff-login', authController.staffLogin);
router.post('/staff-register', authController.staffRegister);
router.get('/staff-me', staffAuthMiddleware, authController.getStaffMe);

module.exports = router;
