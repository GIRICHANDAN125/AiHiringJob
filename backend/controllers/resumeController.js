const path = require('path');
const crypto = require('crypto');
const { query } = require('../config/database');
const { AppError } = require('../middleware/errorHandler');
const resumeParserService = require('../services/resumeParserService');
const logger = require('../utils/logger');

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
          'SELECT id FROM candidates WHERE email = $1 AND user_id = $2',
          [parsedData.email, req.user.id]
        );
        if (existingCandidate.rows.length) {
          candidateId = existingCandidate.rows[0].id;
          // Update candidate info
          await query(
            `UPDATE candidates SET name = $1, phone = $2, location = $3,
             skills = $4, experience_years = $5, education = $6, summary = $7,
             linkedin_url = $8, github_url = $9, updated_at = NOW()
             WHERE id = $10`,
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
          const newCandidate = await query(
            `INSERT INTO candidates (user_id, name, email, phone, location, skills, experience_years, education, summary, linkedin_url, github_url)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING id`,
            [
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
          candidateId = newCandidate.rows[0].id;
        }
      } else {
        const newCandidate = await query(
          `INSERT INTO candidates (user_id, name, skills, experience_years, education, summary)
           VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
          [
            req.user.id,
            parsedData.name || file.originalname.replace(/\.[^/.]+$/, ''),
            JSON.stringify(parsedData.skills || []),
            parsedData.experienceYears || 0,
            JSON.stringify(parsedData.education || []),
            parsedData.summary,
          ]
        );
        candidateId = newCandidate.rows[0].id;
      }

      // Check for duplicate
      const fileContent = parsedData.rawText || '';
      const duplicateHash = crypto.createHash('md5').update(fileContent).digest('hex');
      const existingResume = await query(
        'SELECT id FROM resumes WHERE duplicate_hash = $1 AND user_id = $2',
        [duplicateHash, req.user.id]
      );
      const isDuplicate = existingResume.rows.length > 0;

      // Insert resume
      const resumeResult = await query(
        `INSERT INTO resumes (user_id, candidate_id, filename, file_path, file_type, raw_text, parsed_data, quality_score, duplicate_hash, is_duplicate)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id`,
        [
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
        resumeId: resumeResult.rows[0].id,
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
  const offset = (page - 1) * limit;

  let whereClause = 'r.user_id = $1';
  const params = [req.user.id];

  if (search) {
    params.push(`%${search}%`);
    whereClause += ` AND (c.name ILIKE $${params.length} OR r.filename ILIKE $${params.length})`;
  }

  const result = await query(
    `SELECT r.id, r.filename, r.quality_score, r.is_duplicate, r.created_at,
            c.id as candidate_id, c.name as candidate_name, c.email, c.skills, c.experience_years
     FROM resumes r
     JOIN candidates c ON r.candidate_id = c.id
     WHERE ${whereClause}
     ORDER BY r.created_at DESC
     LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    [...params, limit, offset]
  );

  const countResult = await query(
    `SELECT COUNT(*) FROM resumes r JOIN candidates c ON r.candidate_id = c.id WHERE ${whereClause}`,
    params
  );

  res.json({
    success: true,
    resumes: result.rows,
    pagination: {
      total: parseInt(countResult.rows[0].count),
      page: parseInt(page),
      limit: parseInt(limit),
      pages: Math.ceil(parseInt(countResult.rows[0].count) / limit),
    },
  });
};

const getResume = async (req, res) => {
  const result = await query(
    `SELECT r.*, c.name as candidate_name, c.email, c.skills, c.experience_years, c.education
     FROM resumes r JOIN candidates c ON r.candidate_id = c.id
     WHERE r.id = $1 AND r.user_id = $2`,
    [req.params.id, req.user.id]
  );

  if (!result.rows.length) throw new AppError('Resume not found', 404);

  res.json({ success: true, resume: result.rows[0] });
};

const deleteResume = async (req, res) => {
  const result = await query(
    'DELETE FROM resumes WHERE id = $1 AND user_id = $2 RETURNING id',
    [req.params.id, req.user.id]
  );

  if (!result.rows.length) throw new AppError('Resume not found', 404);

  res.json({ success: true, message: 'Resume deleted' });
};

module.exports = { uploadResumes, getResumes, getResume, deleteResume };
