const express = require('express');
const router = express.Router();
const fileController = require('../controllers/fileController');
const userController = require('../controllers/userController');
const authMiddleware = require('../middleware/authMiddleware');

// GET /api/users/list
router.get('/list', authMiddleware, fileController.getUsers);

// GET /api/users/me
router.get('/me', authMiddleware, userController.getMe);

// PUT /api/users/change-password
router.put('/change-password', authMiddleware, userController.changePassword);

module.exports = router;