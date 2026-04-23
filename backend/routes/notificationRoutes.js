const router = require('express').Router();
const { authenticate } = require('../middleware/authMiddleware');
const {
  getNotifications,
  markNotificationRead,
} = require('../controllers/notificationController');

router.get('/', authenticate, getNotifications);
router.patch('/:id/read', authenticate, markNotificationRead);

module.exports = router;
