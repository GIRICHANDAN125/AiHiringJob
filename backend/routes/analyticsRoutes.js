const router = require('express').Router();
const { getDashboard, getJobAnalytics } = require('../controllers/analyticsController');
const { authenticate } = require('../middleware/authMiddleware');

router.use(authenticate);

router.get('/dashboard', getDashboard);
router.get('/jobs/:jobId', getJobAnalytics);

module.exports = router;
