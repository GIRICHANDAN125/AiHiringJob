const { query } = require('../config/database');
const { AppError } = require('../middleware/errorHandler');
const matchingService = require('../services/matchingService');
const interviewService = require('../services/interviewService');
const { v4: uuidv4 } = require('uuid');

const parseCandidate = (candidate) => {
  if (!candidate) return candidate;
  const c = { ...candidate };
  try {
    c.skills = typeof c.skills === 'string' ? JSON.parse(c.skills) : (c.skills || []);
  } catch (e) {
    c.skills = [];
  }
  try {
    c.education = typeof c.education === 'string' ? JSON.parse(c.education) : (c.education || []);
  } catch (e) {
    c.education = [];
  }
  try {
    c.skill_gap = typeof c.skill_gap === 'string' ? JSON.parse(c.skill_gap) : (c.skill_gap || []);
  } catch (e) {
    c.skill_gap = [];
  }
  try {
    c.matched_skills = typeof c.matched_skills === 'string' ? JSON.parse(c.matched_skills) : (c.matched_skills || []);
  } catch (e) {
    c.matched_skills = [];
  }
  try {
    c.score_breakdown = typeof c.score_breakdown === 'string' ? JSON.parse(c.score_breakdown) : (c.score_breakdown || {});
  } catch (e) {
    c.score_breakdown = {};
  }
  try {
    c.interview_questions = typeof c.interview_questions === 'string' ? JSON.parse(c.interview_questions) : (c.interview_questions || []);
  } catch (e) {
    c.interview_questions = [];
  }
  return c;
};

const matchCandidates = async (req, res) => {
  const { jobId } = req.params;

  // Get job
  const jobResult = await query(
    'SELECT * FROM jobs WHERE id = ? AND user_id = ?',
    [jobId, req.user.id]
  );
  if (!jobResult.rows.length) throw new AppError('Job not found', 404);
  const job = jobResult.rows[0];

  // Get all candidates for this user
  const candidatesResult = await query(
    `SELECT c.*, r.id as resume_id, r.quality_score
     FROM candidates c
     LEFT JOIN resumes r ON r.candidate_id = c.id AND r.user_id = ?
     WHERE c.user_id = ?
     ORDER BY r.created_at DESC`,
    [req.user.id, req.user.id]
  );

  // De-duplicate candidates so we only process each candidate once (with their latest resume)
  const seenCandidates = new Set();
  const candidates = [];
  for (const row of candidatesResult.rows) {
    if (!seenCandidates.has(row.id)) {
      seenCandidates.add(row.id);
      candidates.push(row);
    }
  }

  const matchResults = [];

  for (const candidate of candidates) {
    const matchResult = matchingService.calculateMatch(candidate, job);

    // Upsert application
    await query(
      `INSERT INTO applications (id, job_id, candidate_id, resume_id, match_score, skill_gap, matched_skills, score_breakdown)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE match_score = VALUES(match_score), skill_gap = VALUES(skill_gap), matched_skills = VALUES(matched_skills), score_breakdown = VALUES(score_breakdown), updated_at = NOW()`,
      [
        uuidv4(),
        jobId,
        candidate.id,
        candidate.resume_id,
        matchResult.score,
        JSON.stringify(matchResult.skillGap),
        JSON.stringify(matchResult.matchedSkills),
        JSON.stringify(matchResult.breakdown),
      ]
    );

    let candidateSkills = [];
    try {
      candidateSkills = typeof candidate.skills === 'string' ? JSON.parse(candidate.skills) : (candidate.skills || []);
    } catch (e) {}

    matchResults.push({
      candidateId: candidate.id,
      name: candidate.name,
      email: candidate.email,
      skills: candidateSkills,
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
  
  const parsedLimit = parseInt(limit, 10);
  const parsedOffset = (parseInt(page, 10) - 1) * parsedLimit;

  if (jobId) {
    // Get candidates with scores for a specific job
    const result = await query(
      `SELECT c.*, a.match_score, a.skill_gap, a.matched_skills, a.score_breakdown, a.status, a.pipeline_stage, a.id as application_id
       FROM candidates c
       JOIN applications a ON a.candidate_id = c.id
       WHERE c.user_id = ? AND a.job_id = ?
       ORDER BY a.match_score DESC
       LIMIT ? OFFSET ?`,
      [req.user.id, jobId, parsedLimit, parsedOffset]
    );
    const parsedCandidates = result.rows.map(parseCandidate);
    return res.json({ success: true, candidates: parsedCandidates });
  }

  let whereClause = 'user_id = ?';
  const params = [req.user.id];

  if (search) {
    params.push(`%${search}%`, `%${search}%`);
    whereClause += ` AND (name LIKE ? OR email LIKE ?)`;
  }

  const result = await query(
    `SELECT * FROM candidates WHERE ${whereClause}
     ORDER BY created_at DESC LIMIT ? OFFSET ?`,
    [...params, parsedLimit, parsedOffset]
  );

  const countResult = await query(`SELECT COUNT(*) as count FROM candidates WHERE ${whereClause}`, params);
  
  const parsedCandidates = result.rows.map(parseCandidate);

  res.json({
    success: true,
    candidates: parsedCandidates,
    pagination: { total: parseInt(countResult.rows[0].count, 10), page: parseInt(page, 10), limit: parsedLimit },
  });
};

const getCandidate = async (req, res) => {
  const result = await query(
    'SELECT * FROM candidates WHERE id = ? AND user_id = ?',
    [req.params.id, req.user.id]
  );

  if (!result.rows.length) throw new AppError('Candidate not found', 404);
  const candidate = parseCandidate(result.rows[0]);

  // Get their applications
  const applications = await query(
    `SELECT a.*, j.title as job_title, j.required_skills as job_required_skills
     FROM applications a JOIN jobs j ON a.job_id = j.id
     WHERE a.candidate_id = ?
     ORDER BY a.match_score DESC`,
    [req.params.id]
  );

  candidate.applications = applications.rows.map(app => {
    const a = { ...app };
    try {
      a.skill_gap = typeof a.skill_gap === 'string' ? JSON.parse(a.skill_gap) : (a.skill_gap || []);
    } catch (e) {}
    try {
      a.matched_skills = typeof a.matched_skills === 'string' ? JSON.parse(a.matched_skills) : (a.matched_skills || []);
    } catch (e) {}
    try {
      a.score_breakdown = typeof a.score_breakdown === 'string' ? JSON.parse(a.score_breakdown) : (a.score_breakdown || {});
    } catch (e) {}
    try {
      a.interview_questions = typeof a.interview_questions === 'string' ? JSON.parse(a.interview_questions) : (a.interview_questions || []);
    } catch (e) {}
    try {
      a.job_required_skills = typeof a.job_required_skills === 'string' ? JSON.parse(a.job_required_skills) : (a.job_required_skills || []);
    } catch (e) {}
    return a;
  });

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
     pipeline_stage = COALESCE(?, pipeline_stage),
     status = COALESCE(?, status),
     notes = COALESCE(?, notes),
     updated_at = NOW()
     WHERE id = ?`,
    [stage, status, notes, applicationId]
  );

  if (!result.affectedRows) throw new AppError('Application not found', 404);

  const updated = await query('SELECT * FROM applications WHERE id = ?', [applicationId]);

  res.json({ success: true, application: updated.rows[0] });
};

const generateInterviewQuestions = async (req, res) => {
  const { candidateId, jobId } = req.params;

  const candidateResult = await query('SELECT * FROM candidates WHERE id = ?', [candidateId]);
  const jobResult = await query('SELECT * FROM jobs WHERE id = ?', [jobId]);

  if (!candidateResult.rows.length) throw new AppError('Candidate not found', 404);
  if (!jobResult.rows.length) throw new AppError('Job not found', 404);

  const applicationResult = await query(
    'SELECT * FROM applications WHERE candidate_id = ? AND job_id = ?',
    [candidateId, jobId]
  );

  const candidate = candidateResult.rows[0];
  const job = jobResult.rows[0];
  const application = applicationResult.rows[0];

  const questions = interviewService.generateQuestions(candidate, job, application);

  // Save questions
  if (application) {
    await query(
      'UPDATE applications SET interview_questions = ? WHERE id = ?',
      [JSON.stringify(questions), application.id]
    );
  }

  res.json({ success: true, questions });
};

module.exports = {
  matchCandidates, getCandidates, getCandidate,
  updatePipelineStage, generateInterviewQuestions
};
