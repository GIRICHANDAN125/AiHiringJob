const router = require('express').Router();
const { createJob, getJobs, getJob, updateJob, deleteJob, generateDescription } = require('../controllers/jobController');
const { authenticate } = require('../middleware/authMiddleware');

router.use(authenticate);

router.post('/', createJob);
router.get('/', getJobs);
router.get('/:id', getJob);
router.put('/:id', updateJob);
router.delete('/:id', deleteJob);
router.post('/generate-description', generateDescription);

module.exports = router;
