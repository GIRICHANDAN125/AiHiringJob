const path = require('path');
const crypto = require('crypto');
const { query } = require('../config/database');
const { AppError } = require('../middleware/errorHandler');
const resumeParserService = require('../services/resumeParserService');
const logger = require('../utils/logger');
const { v4: uuidv4 } = require('uuid');

const uploadResumes = async (req, res) => {
  if (!req.files || req.files.length === 0) {
    throw new AppError('No files uploaded', 400);
  }

  const results = [];
  const errors = [];

  for (const file of req.files) {
    try {
      // Parse the resume
      const parsedData = await resumeParserService.parseResume(file.path, file.mimetype);
      const qualityScore = resumeParserService.calculateQualityScore(parsedData);

      // Create or find candidate
      let candidateId;
      if (parsedData.email) {
        const existingCandidate = await query(
          'SELECT id FROM candidates WHERE email = ? AND user_id = ?',
          [parsedData.email, req.user.id]
        );
        if (existingCandidate.rows.length) {
          candidateId = existingCandidate.rows[0].id;
          // Update candidate info
          await query(
            `UPDATE candidates SET name = ?, phone = ?, location = ?,
             skills = ?, experience_years = ?, education = ?, summary = ?,
             linkedin_url = ?, github_url = ?, updated_at = NOW()
             WHERE id = ?`,
            [
              parsedData.name || 'Unknown',
              parsedData.phone,
              parsedData.location,
              JSON.stringify(parsedData.skills || []),
              parsedData.experienceYears || 0,
              JSON.stringify(parsedData.education || []),
              parsedData.summary,
              parsedData.linkedinUrl,
              parsedData.githubUrl,
              candidateId,
            ]
          );
        } else {
          candidateId = uuidv4();
          const newCandidate = await query(
            `INSERT INTO candidates (id, user_id, name, email, phone, location, skills, experience_years, education, summary, linkedin_url, github_url)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              candidateId,
              req.user.id,
              parsedData.name || 'Unknown',
              parsedData.email,
              parsedData.phone,
              parsedData.location,
              JSON.stringify(parsedData.skills || []),
              parsedData.experienceYears || 0,
              JSON.stringify(parsedData.education || []),
              parsedData.summary,
              parsedData.linkedinUrl,
              parsedData.githubUrl,
            ]
          );
        }
      } else {
        candidateId = uuidv4();
        const newCandidate = await query(
          `INSERT INTO candidates (id, user_id, name, skills, experience_years, education, summary)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            candidateId,
            req.user.id,
            parsedData.name || file.originalname.replace(/\.[^/.]+$/, ''),
            JSON.stringify(parsedData.skills || []),
            parsedData.experienceYears || 0,
            JSON.stringify(parsedData.education || []),
            parsedData.summary,
          ]
        );
      }

      // Check for duplicate
      const fileContent = parsedData.rawText || '';
      const duplicateHash = crypto.createHash('md5').update(fileContent).digest('hex');
      const existingResume = await query(
        'SELECT id FROM resumes WHERE duplicate_hash = ? AND user_id = ?',
        [duplicateHash, req.user.id]
      );
      const isDuplicate = existingResume.rows.length > 0;

      // Insert resume
      const resumeId = uuidv4();
      const resumeResult = await query(
        `INSERT INTO resumes (id, user_id, candidate_id, filename, file_path, file_type, raw_text, parsed_data, quality_score, duplicate_hash, is_duplicate)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          resumeId,
          req.user.id,
          candidateId,
          file.originalname,
          file.path,
          file.mimetype,
          parsedData.rawText,
          JSON.stringify(parsedData),
          qualityScore,
          duplicateHash,
          isDuplicate,
        ]
      );

      results.push({
        resumeId,
        candidateId,
        filename: file.originalname,
        candidateName: parsedData.name,
        skillsFound: parsedData.skills?.length || 0,
        qualityScore,
        isDuplicate,
        parsedData: {
          name: parsedData.name,
          email: parsedData.email,
          skills: parsedData.skills,
          experienceYears: parsedData.experienceYears,
        },
      });
    } catch (error) {
      logger.error(`Failed to process ${file.originalname}:`, error);
      errors.push({ filename: file.originalname, error: error.message });
    }
  }

  res.status(201).json({
    success: true,
    message: `Processed ${results.length} resumes successfully`,
    results,
    errors,
  });
};

const getResumes = async (req, res) => {
  const { page = 1, limit = 20, search } = req.query;
  
  const parsedLimit = parseInt(limit, 10);
  const parsedOffset = (parseInt(page, 10) - 1) * parsedLimit;

  let whereClause = 'r.user_id = ?';
  const params = [req.user.id];

  if (search) {
    params.push(`%${search}%`, `%${search}%`);
    whereClause += ` AND (c.name LIKE ? OR r.filename LIKE ?)`;
  }

  const result = await query(
    `SELECT r.id, r.filename, r.quality_score, r.is_duplicate, r.created_at,
            c.id as candidate_id, c.name as candidate_name, c.email, c.skills, c.experience_years
     FROM resumes r
     JOIN candidates c ON r.candidate_id = c.id
     WHERE ${whereClause}
     ORDER BY r.created_at DESC
     LIMIT ? OFFSET ?`,
    [...params, parsedLimit, parsedOffset]
  );

  const countResult = await query(
    `SELECT COUNT(*) as count FROM resumes r JOIN candidates c ON r.candidate_id = c.id WHERE ${whereClause}`,
    params
  );

  const parsedResumes = result.rows.map(row => {
    const r = { ...row };
    try {
      r.skills = typeof r.skills === 'string' ? JSON.parse(r.skills) : (r.skills || []);
    } catch (e) {
      r.skills = [];
    }
    return r;
  });

  res.json({
    success: true,
    resumes: parsedResumes,
    pagination: {
      total: parseInt(countResult.rows[0].count, 10),
      page: parseInt(page, 10),
      limit: parsedLimit,
      pages: Math.ceil(parseInt(countResult.rows[0].count, 10) / parsedLimit),
    },
  });
};

const getResume = async (req, res) => {
  const result = await query(
    `SELECT r.*, c.name as candidate_name, c.email, c.skills, c.experience_years, c.education
     FROM resumes r JOIN candidates c ON r.candidate_id = c.id
     WHERE r.id = ? AND r.user_id = ?`,
    [req.params.id, req.user.id]
  );

  if (!result.rows.length) throw new AppError('Resume not found', 404);

  const row = result.rows[0];
  const resume = { ...row };

  try {
    resume.parsed_data = typeof resume.parsed_data === 'string' ? JSON.parse(resume.parsed_data) : (resume.parsed_data || {});
  } catch (e) {
    resume.parsed_data = {};
  }
  try {
    resume.skills = typeof resume.skills === 'string' ? JSON.parse(resume.skills) : (resume.skills || []);
  } catch (e) {
    resume.skills = [];
  }
  try {
    resume.education = typeof resume.education === 'string' ? JSON.parse(resume.education) : (resume.education || []);
  } catch (e) {
    resume.education = [];
  }

  res.json({ success: true, resume });
};

const deleteResume = async (req, res) => {
  const result = await query(
    'DELETE FROM resumes WHERE id = ? AND user_id = ?',
    [req.params.id, req.user.id]
  );

  if (!result.affectedRows) throw new AppError('Resume not found', 404);

  res.json({ success: true, message: 'Resume deleted' });
};

module.exports = { uploadResumes, getResumes, getResume, deleteResume };
