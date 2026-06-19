const { query } = require('../config/database');
const { AppError } = require('../middleware/errorHandler');
const jobDescriptionService = require('../services/jobDescriptionService');
const { v4: uuidv4 } = require('uuid');

const parseJobSkills = (job) => {
  if (!job) return job;
  const j = { ...job };
  try {
    j.required_skills = typeof j.required_skills === 'string' ? JSON.parse(j.required_skills) : (j.required_skills || []);
  } catch (e) {
    j.required_skills = [];
  }
  try {
    j.nice_to_have_skills = typeof j.nice_to_have_skills === 'string' ? JSON.parse(j.nice_to_have_skills) : (j.nice_to_have_skills || []);
  } catch (e) {
    j.nice_to_have_skills = [];
  }
  return j;
};

const createJob = async (req, res) => {
  const {
    title, description, requiredSkills, niceToHaveSkills,
    experienceMin, experienceMax, educationLevel, location, employmentType
  } = req.body;

  if (!title) throw new AppError('Job title is required', 400);
  if (!requiredSkills || !requiredSkills.length) throw new AppError('At least one required skill is needed', 400);

  const jobId = uuidv4();

  // Auto-generate description if not provided
  let finalDescription = description;
  if (!description) {
    finalDescription = jobDescriptionService.generate({
      title, requiredSkills, niceToHaveSkills, experienceMin, experienceMax, employmentType, location
    });
  }

  const result = await query(
    `INSERT INTO jobs (id, user_id, title, description, required_skills, nice_to_have_skills,
     experience_min, experience_max, education_level, location, employment_type)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      jobId, req.user.id, title, finalDescription,
      JSON.stringify(requiredSkills || []),
      JSON.stringify(niceToHaveSkills || []),
      experienceMin || 0, experienceMax || 10,
      educationLevel, location, employmentType || 'full-time',
    ]
  );

  res.status(201).json({
    success: true,
    job: {
      id: jobId,
      user_id: req.user.id,
      title,
      description: finalDescription,
      required_skills: requiredSkills || [],
      nice_to_have_skills: niceToHaveSkills || [],
      experience_min: experienceMin || 0,
      experience_max: experienceMax || 10,
      education_level: educationLevel,
      location,
      employment_type: employmentType || 'full-time',
      status: 'active',
    },
  });
};

const getJobs = async (req, res) => {
  const { page = 1, limit = 20, status } = req.query;
  
  const parsedLimit = parseInt(limit, 10);
  const parsedOffset = (parseInt(page, 10) - 1) * parsedLimit;

  const params = [req.user.id];
  let whereClause = 'user_id = ?';

  if (status) {
    params.push(status);
    whereClause += ` AND status = ?`;
  }

  const result = await query(
    `SELECT j.*, 
     (SELECT COUNT(*) FROM applications a WHERE a.job_id = j.id) as application_count,
     (SELECT AVG(a.match_score) FROM applications a WHERE a.job_id = j.id) as avg_match_score
     FROM jobs j
     WHERE ${whereClause}
     ORDER BY j.created_at DESC
     LIMIT ? OFFSET ?`,
    [...params, parsedLimit, parsedOffset]
  );

  const countResult = await query(`SELECT COUNT(*) as count FROM jobs WHERE ${whereClause}`, params);

  const parsedJobs = result.rows.map(parseJobSkills);

  res.json({
    success: true,
    jobs: parsedJobs,
    pagination: {
      total: parseInt(countResult.rows[0].count, 10),
      page: parseInt(page, 10),
      limit: parsedLimit,
    },
  });
};

const getJob = async (req, res) => {
  const result = await query(
    `SELECT j.*,
     (SELECT COUNT(*) FROM applications a WHERE a.job_id = j.id) as application_count
     FROM jobs j
     WHERE j.id = ? AND j.user_id = ?`,
    [req.params.id, req.user.id]
  );

  if (!result.rows.length) throw new AppError('Job not found', 404);
  const job = parseJobSkills(result.rows[0]);

  res.json({ success: true, job });
};

const updateJob = async (req, res) => {
  try {
    const { title, description, requiredSkills, niceToHaveSkills,
      experienceMin, experienceMax, educationLevel, location, employmentType, status } = req.body;

    // Dynamically build SET clause to avoid COALESCE issues with JSON columns
    const setClauses = [];
    const values = [];

    if (title !== undefined) { setClauses.push('title = ?'); values.push(title); }
    if (description !== undefined) { setClauses.push('description = ?'); values.push(description); }
    if (requiredSkills !== undefined) { setClauses.push('required_skills = ?'); values.push(JSON.stringify(requiredSkills)); }
    if (niceToHaveSkills !== undefined) { setClauses.push('nice_to_have_skills = ?'); values.push(JSON.stringify(niceToHaveSkills)); }
    if (experienceMin !== undefined) { setClauses.push('experience_min = ?'); values.push(experienceMin); }
    if (experienceMax !== undefined) { setClauses.push('experience_max = ?'); values.push(experienceMax); }
    if (educationLevel !== undefined) { setClauses.push('education_level = ?'); values.push(educationLevel); }
    if (location !== undefined) { setClauses.push('location = ?'); values.push(location); }
    if (employmentType !== undefined) { setClauses.push('employment_type = ?'); values.push(employmentType); }
    if (status !== undefined) { setClauses.push('status = ?'); values.push(status); }

    if (setClauses.length === 0) {
      return res.status(400).json({ success: false, message: 'No fields provided to update' });
    }

    setClauses.push('updated_at = NOW()');
    values.push(req.params.id, req.user.id);

    const updateSql = `UPDATE jobs SET ${setClauses.join(', ')} WHERE id = ? AND user_id = ?`;
    console.log('Update Job SQL:', updateSql);
    console.log('Update Job values:', values);

    const updateResult = await query(updateSql, values);

    if (updateResult.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Job not found or you do not have permission to update it' });
    }

    const result = await query('SELECT * FROM jobs WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
    if (!result.rows.length) {
      return res.status(404).json({ success: false, message: 'Job not found after update' });
    }

    const job = parseJobSkills(result.rows[0]);
    return res.json({ success: true, job });
  } catch (error) {
    console.error('Update Job Error:', error);
    console.error('Error code:', error.code);
    console.error('SQL message:', error.sqlMessage);
    return res.status(500).json({
      success: false,
      message: process.env.NODE_ENV === 'production' ? 'Failed to update job' : (error.sqlMessage || error.message),
    });
  }
};

const deleteJob = async (req, res) => {
  const result = await query(
    'DELETE FROM jobs WHERE id = ? AND user_id = ?',
    [req.params.id, req.user.id]
  );

  if (!result.affectedRows) throw new AppError('Job not found', 404);

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
