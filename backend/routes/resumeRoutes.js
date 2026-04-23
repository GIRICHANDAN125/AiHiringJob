const router = require('express').Router();
const { uploadResumes, getResumes, getResume, deleteResume } = require('../controllers/resumeController');
const { authenticate } = require('../middleware/authMiddleware');
const { upload } = require('../middleware/uploadMiddleware');

router.use(authenticate);

router.post('/upload', upload.array('resumes', 20), uploadResumes);
router.get('/', getResumes);
router.get('/:id', getResume);
router.delete('/:id', deleteResume);

module.exports = router;
