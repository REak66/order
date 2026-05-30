const express = require('express');
const router = express.Router();
const staffController = require('../controllers/staffController');
const authMiddleware = require('../middleware/authMiddleware');

router.get('/', authMiddleware, staffController.getAllStaff);
router.post('/', authMiddleware, staffController.addStaff);
router.post('/import', authMiddleware, staffController.importStaffBulk);

router.get('/positions', authMiddleware, staffController.getAllPositions);
router.post('/positions', authMiddleware, staffController.addPosition);
router.delete('/positions/:name', authMiddleware, staffController.deletePosition);
router.get('/departments', authMiddleware, staffController.getAllDepartments);
router.post('/departments', authMiddleware, staffController.addDepartment);
router.delete('/departments/:name', authMiddleware, staffController.deleteDepartment);

router.put('/:id', authMiddleware, staffController.updateStaff);
router.delete('/:id', authMiddleware, staffController.deleteStaff);

module.exports = router;
