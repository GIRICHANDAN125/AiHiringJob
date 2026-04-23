const { query } = require('../config/database');
const { AppError } = require('../middleware/errorHandler');
const matchingService = require('../services/matchingService');
const interviewService = require('../services/interviewService');

const matchCandidates = async (req, res) => {
  const { jobId } = req.params;

  // Get job
  const jobResult = await query(
    'SELECT * FROM jobs WHERE id = $1 AND user_id = $2',
    [jobId, req.user.id]
  );
  if (!jobResult.rows.length) throw new AppError('Job not found', 404);
  const job = jobResult.rows[0];

  // Get all candidates for this user
  const candidatesResult = await query(
    `SELECT c.*, r.id as resume_id, r.quality_score
     FROM candidates c
     LEFT JOIN resumes r ON r.candidate_id = c.id AND r.user_id = $1
     WHERE c.user_id = $1
     ORDER BY r.created_at DESC`,
    [req.user.id]
  );

  const candidates = candidatesResult.rows;
  const matchResults = [];

  for (const candidate of candidates) {
    const matchResult = matchingService.calculateMatch(candidate, job);

    // Upsert application
    await query(
      `INSERT INTO applications (job_id, candidate_id, resume_id, match_score, skill_gap, matched_skills, score_breakdown)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (job_id, candidate_id)
       DO UPDATE SET match_score = $4, skill_gap = $5, matched_skills = $6, score_breakdown = $7, updated_at = NOW()`,
      [
        jobId,
        candidate.id,
        candidate.resume_id,
        matchResult.score,
        JSON.stringify(matchResult.skillGap),
        JSON.stringify(matchResult.matchedSkills),
        JSON.stringify(matchResult.breakdown),
      ]
    );

    matchResults.push({
      candidateId: candidate.id,
      name: candidate.name,
      email: candidate.email,
      skills: candidate.skills,
      experienceYears: candidate.experience_years,
      matchScore: matchResult.score,
      matchedSkills: matchResult.matchedSkills,
      skillGap: matchResult.skillGap,
      breakdown: matchResult.breakdown,
      recommendation: matchingService.getRecommendation(matchResult.score),
    });
  }

  matchResults.sort((a, b) => b.matchScore - a.matchScore);

  res.json({
    success: true,
    jobTitle: job.title,
    totalCandidates: matchResults.length,
    candidates: matchResults,
  });
};

const getCandidates = async (req, res) => {
  const { page = 1, limit = 20, search, jobId } = req.query;
  const offset = (page - 1) * limit;

  if (jobId) {
    // Get candidates with scores for a specific job
    const result = await query(
      `SELECT c.*, a.match_score, a.skill_gap, a.matched_skills, a.score_breakdown, a.status, a.pipeline_stage, a.id as application_id
       FROM candidates c
       JOIN applications a ON a.candidate_id = c.id
       WHERE c.user_id = $1 AND a.job_id = $2
       ORDER BY a.match_score DESC
       LIMIT $3 OFFSET $4`,
      [req.user.id, jobId, limit, offset]
    );
    return res.json({ success: true, candidates: result.rows });
  }

  let whereClause = 'user_id = $1';
  const params = [req.user.id];

  if (search) {
    params.push(`%${search}%`);
    whereClause += ` AND (name ILIKE $${params.length} OR email ILIKE $${params.length})`;
  }

  const result = await query(
    `SELECT * FROM candidates WHERE ${whereClause}
     ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    [...params, limit, offset]
  );

  const countResult = await query(`SELECT COUNT(*) FROM candidates WHERE ${whereClause}`, params);

  res.json({
    success: true,
    candidates: result.rows,
    pagination: { total: parseInt(countResult.rows[0].count), page: parseInt(page), limit: parseInt(limit) },
  });
};

const getCandidate = async (req, res) => {
  const result = await query(
    'SELECT * FROM candidates WHERE id = $1 AND user_id = $2',
    [req.params.id, req.user.id]
  );

  if (!result.rows.length) throw new AppError('Candidate not found', 404);
  const candidate = result.rows[0];

  // Get their applications
  const applications = await query(
    `SELECT a.*, j.title as job_title, j.required_skills as job_required_skills
     FROM applications a JOIN jobs j ON a.job_id = j.id
     WHERE a.candidate_id = $1
     ORDER BY a.match_score DESC`,
    [req.params.id]
  );

  candidate.applications = applications.rows;

  res.json({ success: true, candidate });
};

const updatePipelineStage = async (req, res) => {
  const { applicationId } = req.params;
  const { stage, status, notes } = req.body;

  const validStages = ['screening', 'phone_interview', 'technical', 'final_interview', 'offer', 'hired', 'rejected'];
  if (stage && !validStages.includes(stage)) {
    throw new AppError(`Invalid stage. Must be one of: ${validStages.join(', ')}`, 400);
  }

  const result = await query(
    `UPDATE applications SET
     pipeline_stage = COALESCE($1, pipeline_stage),
     status = COALESCE($2, status),
     notes = COALESCE($3, notes),
     updated_at = NOW()
     WHERE id = $4
     RETURNING *`,
    [stage, status, notes, applicationId]
  );

  if (!result.rows.length) throw new AppError('Application not found', 404);

  res.json({ success: true, application: result.rows[0] });
};

const generateInterviewQuestions = async (req, res) => {
  const { candidateId, jobId } = req.params;

  const candidateResult = await query('SELECT * FROM candidates WHERE id = $1', [candidateId]);
  const jobResult = await query('SELECT * FROM jobs WHERE id = $1', [jobId]);

  if (!candidateResult.rows.length) throw new AppError('Candidate not found', 404);
  if (!jobResult.rows.length) throw new AppError('Job not found', 404);

  const applicationResult = await query(
    'SELECT * FROM applications WHERE candidate_id = $1 AND job_id = $2',
    [candidateId, jobId]
  );

  const candidate = candidateResult.rows[0];
  const job = jobResult.rows[0];
  const application = applicationResult.rows[0];

  const questions = interviewService.generateQuestions(candidate, job, application);

  // Save questions
  if (application) {
    await query(
      'UPDATE applications SET interview_questions = $1 WHERE id = $2',
      [JSON.stringify(questions), application.id]
    );
  }

  res.json({ success: true, questions });
};

module.exports = {
  matchCandidates, getCandidates, getCandidate,
  updatePipelineStage, generateInterviewQuestions
};
