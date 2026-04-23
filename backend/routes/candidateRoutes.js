const router = require('express').Router();
const { matchCandidates, getCandidates, getCandidate, updatePipelineStage, generateInterviewQuestions } = require('../controllers/candidateController');
const { authenticate } = require('../middleware/authMiddleware');

router.use(authenticate);

router.get('/', getCandidates);
router.get('/:id', getCandidate);
router.post('/match/:jobId', matchCandidates);
router.put('/pipeline/:applicationId', updatePipelineStage);
router.post('/:candidateId/interview-questions/:jobId', generateInterviewQuestions);

module.exports = router;
