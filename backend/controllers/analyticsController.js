const { query } = require('../config/database');

const getDashboard = async (req, res) => {
  const userId = req.user.id;

  const [
    totalResumes,
    totalJobs,
    totalCandidates,
    totalApplications,
    recentActivity,
    topSkills,
    pipelineStats,
    scoreDistribution,
  ] = await Promise.all([
    query('SELECT COUNT(*) AS count FROM resumes WHERE user_id = ?', [userId]),
    query('SELECT COUNT(*) AS count FROM jobs WHERE user_id = ?', [userId]),
    query('SELECT COUNT(*) AS count FROM candidates WHERE user_id = ?', [userId]),
    query(`SELECT COUNT(*) AS count FROM applications a JOIN jobs j ON a.job_id = j.id WHERE j.user_id = ?`, [userId]),

    // Recent uploads (last 7 days)
    query(
      `SELECT DATE(created_at) as date, COUNT(*) as count
       FROM resumes WHERE user_id = ? AND created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
       GROUP BY DATE(created_at) ORDER BY date`,
      [userId]
    ),

    // Top skills among candidates - fetched as raw JSON and aggregated in JS
    query(
      `SELECT c.skills FROM candidates c WHERE c.user_id = ?`,
      [userId]
    ),

    // Pipeline stage distribution
    query(
      `SELECT a.pipeline_stage, COUNT(*) as count
       FROM applications a JOIN jobs j ON a.job_id = j.id
       WHERE j.user_id = ?
       GROUP BY a.pipeline_stage`,
      [userId]
    ),

    // Match score distribution
    query(
      `SELECT
       CASE
         WHEN match_score >= 80 THEN 'Excellent (80-100%)'
         WHEN match_score >= 60 THEN 'Good (60-79%)'
         WHEN match_score >= 40 THEN 'Fair (40-59%)'
         ELSE 'Low (<40%)'
       END as \`range\`,
       COUNT(*) as count
       FROM applications a JOIN jobs j ON a.job_id = j.id
       WHERE j.user_id = ?
       GROUP BY \`range\``,
      [userId]
    ),
  ]);

  // Aggregate candidate skills in JavaScript
  const allSkills = [];
  for (const row of topSkills.rows) {
    let skills = [];
    if (row.skills) {
      try {
        skills = typeof row.skills === 'string' ? JSON.parse(row.skills) : row.skills;
      } catch (e) {
        // ignore
      }
    }
    if (Array.isArray(skills)) {
      allSkills.push(...skills);
    }
  }

  const skillCounts = {};
  for (const skill of allSkills) {
    if (skill) {
      const normalized = String(skill).trim();
      if (normalized) {
        const matchKey = Object.keys(skillCounts).find(k => k.toLowerCase() === normalized.toLowerCase()) || normalized;
        skillCounts[matchKey] = (skillCounts[matchKey] || 0) + 1;
      }
    }
  }

  const topSkillsList = Object.entries(skillCounts)
    .map(([skill, count]) => ({ skill, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  res.json({
    success: true,
    stats: {
      totalResumes: parseInt(totalResumes.rows[0]?.count || 0, 10),
      totalJobs: parseInt(totalJobs.rows[0]?.count || 0, 10),
      totalCandidates: parseInt(totalCandidates.rows[0]?.count || 0, 10),
      totalApplications: parseInt(totalApplications.rows[0]?.count || 0, 10),
    },
    recentActivity: recentActivity.rows,
    topSkills: topSkillsList,
    pipelineStats: pipelineStats.rows,
    scoreDistribution: scoreDistribution.rows,
  });
};

const getJobAnalytics = async (req, res) => {
  const { jobId } = req.params;
  const userId = req.user.id;

  const jobCheck = await query('SELECT id, title FROM jobs WHERE id = ? AND user_id = ?', [jobId, userId]);
  if (!jobCheck.rows.length) {
    return res.status(404).json({ success: false, error: 'Job not found' });
  }

  const [scoreStats, pipelineBreakdown, skillGapFrequency] = await Promise.all([
    query(
      `SELECT AVG(match_score) as avg, MAX(match_score) as max, MIN(match_score) as min,
              COUNT(*) as total FROM applications WHERE job_id = ?`,
      [jobId]
    ),
    query(
      `SELECT pipeline_stage, COUNT(*) as count FROM applications WHERE job_id = ? GROUP BY pipeline_stage`,
      [jobId]
    ),
    query(
      `SELECT a.skill_gap FROM applications a WHERE a.job_id = ?`,
      [jobId]
    ),
  ]);

  // Aggregate common skill gaps in JavaScript
  const allGaps = [];
  for (const row of skillGapFrequency.rows) {
    let gaps = [];
    if (row.skill_gap) {
      try {
        gaps = typeof row.skill_gap === 'string' ? JSON.parse(row.skill_gap) : row.skill_gap;
      } catch (e) {
        // ignore
      }
    }
    if (Array.isArray(gaps)) {
      allGaps.push(...gaps);
    }
  }

  const gapCounts = {};
  for (const gap of allGaps) {
    if (gap) {
      const normalized = String(gap).trim();
      if (normalized) {
        const matchKey = Object.keys(gapCounts).find(k => k.toLowerCase() === normalized.toLowerCase()) || normalized;
        gapCounts[matchKey] = (gapCounts[matchKey] || 0) + 1;
      }
    }
  }

  const commonSkillGapsList = Object.entries(gapCounts)
    .map(([skill, frequency]) => ({ skill, frequency }))
    .sort((a, b) => b.frequency - a.frequency)
    .slice(0, 10);

  res.json({
    success: true,
    job: jobCheck.rows[0],
    scoreStats: {
      avg: scoreStats.rows[0]?.avg ? Math.round(parseFloat(scoreStats.rows[0].avg)) : 0,
      max: scoreStats.rows[0]?.max || 0,
      min: scoreStats.rows[0]?.min || 0,
      total: scoreStats.rows[0]?.total || 0,
    },
    pipelineBreakdown: pipelineBreakdown.rows,
    commonSkillGaps: commonSkillGapsList,
  });
};

module.exports = { getDashboard, getJobAnalytics };
