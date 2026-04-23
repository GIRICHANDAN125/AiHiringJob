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
    query('SELECT COUNT(*) FROM resumes WHERE user_id = $1', [userId]),
    query('SELECT COUNT(*) FROM jobs WHERE user_id = $1', [userId]),
    query('SELECT COUNT(*) FROM candidates WHERE user_id = $1', [userId]),
    query(`SELECT COUNT(*) FROM applications a JOIN jobs j ON a.job_id = j.id WHERE j.user_id = $1`, [userId]),

    // Recent uploads (last 7 days)
    query(
      `SELECT DATE(created_at) as date, COUNT(*) as count
       FROM resumes WHERE user_id = $1 AND created_at >= NOW() - INTERVAL '7 days'
       GROUP BY DATE(created_at) ORDER BY date`,
      [userId]
    ),

    // Top skills among candidates
    query(
      `SELECT skill, COUNT(*) as count
       FROM candidates c, jsonb_array_elements_text(c.skills) as skill
       WHERE c.user_id = $1
       GROUP BY skill ORDER BY count DESC LIMIT 10`,
      [userId]
    ),

    // Pipeline stage distribution
    query(
      `SELECT a.pipeline_stage, COUNT(*) as count
       FROM applications a JOIN jobs j ON a.job_id = j.id
       WHERE j.user_id = $1
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
       END as range,
       COUNT(*) as count
       FROM applications a JOIN jobs j ON a.job_id = j.id
       WHERE j.user_id = $1
       GROUP BY range`,
      [userId]
    ),
  ]);

  res.json({
    success: true,
    stats: {
      totalResumes: parseInt(totalResumes.rows[0].count),
      totalJobs: parseInt(totalJobs.rows[0].count),
      totalCandidates: parseInt(totalCandidates.rows[0].count),
      totalApplications: parseInt(totalApplications.rows[0].count),
    },
    recentActivity: recentActivity.rows,
    topSkills: topSkills.rows,
    pipelineStats: pipelineStats.rows,
    scoreDistribution: scoreDistribution.rows,
  });
};

const getJobAnalytics = async (req, res) => {
  const { jobId } = req.params;
  const userId = req.user.id;

  const jobCheck = await query('SELECT id, title FROM jobs WHERE id = $1 AND user_id = $2', [jobId, userId]);
  if (!jobCheck.rows.length) {
    return res.status(404).json({ success: false, error: 'Job not found' });
  }

  const [scoreStats, pipelineBreakdown, skillGapFrequency] = await Promise.all([
    query(
      `SELECT AVG(match_score) as avg, MAX(match_score) as max, MIN(match_score) as min,
              COUNT(*) as total FROM applications WHERE job_id = $1`,
      [jobId]
    ),
    query(
      `SELECT pipeline_stage, COUNT(*) as count FROM applications WHERE job_id = $1 GROUP BY pipeline_stage`,
      [jobId]
    ),
    query(
      `SELECT skill, COUNT(*) as frequency
       FROM applications a, jsonb_array_elements_text(a.skill_gap) as skill
       WHERE a.job_id = $1
       GROUP BY skill ORDER BY frequency DESC LIMIT 10`,
      [jobId]
    ),
  ]);

  res.json({
    success: true,
    job: jobCheck.rows[0],
    scoreStats: scoreStats.rows[0],
    pipelineBreakdown: pipelineBreakdown.rows,
    commonSkillGaps: skillGapFrequency.rows,
  });
};

module.exports = { getDashboard, getJobAnalytics };
