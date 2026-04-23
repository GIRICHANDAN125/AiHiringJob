const { query } = require('../config/database');
const { AppError } = require('../middleware/errorHandler');
const jobDescriptionService = require('../services/jobDescriptionService');

const createJob = async (req, res) => {
  const {
    title, description, requiredSkills, niceToHaveSkills,
    experienceMin, experienceMax, educationLevel, location, employmentType
  } = req.body;

  if (!title) throw new AppError('Job title is required', 400);
  if (!requiredSkills || !requiredSkills.length) throw new AppError('At least one required skill is needed', 400);

  // Auto-generate description if not provided
  let finalDescription = description;
  if (!description) {
    finalDescription = jobDescriptionService.generate({
      title, requiredSkills, niceToHaveSkills, experienceMin, experienceMax, employmentType, location
    });
  }

  const result = await query(
    `INSERT INTO jobs (user_id, title, description, required_skills, nice_to_have_skills,
     experience_min, experience_max, education_level, location, employment_type)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
    [
      req.user.id, title, finalDescription,
      JSON.stringify(requiredSkills || []),
      JSON.stringify(niceToHaveSkills || []),
      experienceMin || 0, experienceMax || 10,
      educationLevel, location, employmentType || 'full-time',
    ]
  );

  res.status(201).json({ success: true, job: result.rows[0] });
};

const getJobs = async (req, res) => {
  const { page = 1, limit = 20, status } = req.query;
  const offset = (page - 1) * limit;
  const params = [req.user.id];
  let whereClause = 'user_id = $1';

  if (status) {
    params.push(status);
    whereClause += ` AND status = $${params.length}`;
  }

  const result = await query(
    `SELECT j.*, 
     (SELECT COUNT(*) FROM applications a WHERE a.job_id = j.id) as application_count,
     (SELECT AVG(a.match_score) FROM applications a WHERE a.job_id = j.id) as avg_match_score
     FROM jobs j
     WHERE ${whereClause}
     ORDER BY j.created_at DESC
     LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    [...params, limit, offset]
  );

  const countResult = await query(`SELECT COUNT(*) FROM jobs WHERE ${whereClause}`, params);

  res.json({
    success: true,
    jobs: result.rows,
    pagination: {
      total: parseInt(countResult.rows[0].count),
      page: parseInt(page),
      limit: parseInt(limit),
    },
  });
};

const getJob = async (req, res) => {
  const result = await query(
    `SELECT j.*,
     (SELECT COUNT(*) FROM applications a WHERE a.job_id = j.id) as application_count
     FROM jobs j
     WHERE j.id = $1 AND j.user_id = $2`,
    [req.params.id, req.user.id]
  );

  if (!result.rows.length) throw new AppError('Job not found', 404);

  res.json({ success: true, job: result.rows[0] });
};

const updateJob = async (req, res) => {
  const { title, description, requiredSkills, niceToHaveSkills,
    experienceMin, experienceMax, educationLevel, location, employmentType, status } = req.body;

  const result = await query(
    `UPDATE jobs SET
     title = COALESCE($1, title),
     description = COALESCE($2, description),
     required_skills = COALESCE($3, required_skills),
     nice_to_have_skills = COALESCE($4, nice_to_have_skills),
     experience_min = COALESCE($5, experience_min),
     experience_max = COALESCE($6, experience_max),
     education_level = COALESCE($7, education_level),
     location = COALESCE($8, location),
     employment_type = COALESCE($9, employment_type),
     status = COALESCE($10, status),
     updated_at = NOW()
     WHERE id = $11 AND user_id = $12
     RETURNING *`,
    [
      title, description,
      requiredSkills ? JSON.stringify(requiredSkills) : null,
      niceToHaveSkills ? JSON.stringify(niceToHaveSkills) : null,
      experienceMin, experienceMax, educationLevel, location,
      employmentType, status, req.params.id, req.user.id,
    ]
  );

  if (!result.rows.length) throw new AppError('Job not found', 404);

  res.json({ success: true, job: result.rows[0] });
};

const deleteJob = async (req, res) => {
  const result = await query(
    'DELETE FROM jobs WHERE id = $1 AND user_id = $2 RETURNING id',
    [req.params.id, req.user.id]
  );

  if (!result.rows.length) throw new AppError('Job not found', 404);

  res.json({ success: true, message: 'Job deleted' });
};

const generateDescription = async (req, res) => {
  const { title, requiredSkills, niceToHaveSkills, experienceMin, experienceMax, employmentType, location } = req.body;

  const description = jobDescriptionService.generate({
    title, requiredSkills, niceToHaveSkills, experienceMin, experienceMax, employmentType, location
  });

  res.json({ success: true, description });
};

module.exports = { createJob, getJobs, getJob, updateJob, deleteJob, generateDescription };
