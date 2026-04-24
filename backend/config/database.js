const { Pool } = require('pg');
const logger = require('../utils/logger');

const connectionString = process.env.DATABASE_URL || process.env.DB_URL;

const poolConfig = connectionString
  ? {
      connectionString,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    }
  : {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT, 10) || 5432,
      database: process.env.DB_NAME || 'ai_hiring_db',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'password',
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    };

const pool = new Pool(poolConfig);

pool.on('error', (err) => {
  logger.error('Unexpected error on idle client', err);
});

const connectDB = async () => {
  const client = await pool.connect();
  try {
    await client.query('SELECT NOW()');
    logger.info(`✅ PostgreSQL connected (${connectionString ? 'URL' : 'HOST'})`);
    await runMigrations(client);
  } finally {
    client.release();
  }
};

const runMigrations = async (client) => {
  await client.query(`
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      role VARCHAR(50) DEFAULT 'recruiter',
      is_verified BOOLEAN DEFAULT FALSE,
      otp_code VARCHAR(6),
      otp_expires_at TIMESTAMP,
      refresh_token TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS jobs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      title VARCHAR(255) NOT NULL,
      description TEXT,
      required_skills JSONB DEFAULT '[]',
      nice_to_have_skills JSONB DEFAULT '[]',
      experience_min INTEGER DEFAULT 0,
      experience_max INTEGER DEFAULT 10,
      education_level VARCHAR(100),
      location VARCHAR(255),
      employment_type VARCHAR(50) DEFAULT 'full-time',
      status VARCHAR(50) DEFAULT 'active',
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS candidates (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255),
      phone VARCHAR(50),
      location VARCHAR(255),
      skills JSONB DEFAULT '[]',
      experience_years INTEGER DEFAULT 0,
      education JSONB DEFAULT '[]',
      summary TEXT,
      linkedin_url VARCHAR(500),
      github_url VARCHAR(500),
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS resumes (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      candidate_id UUID REFERENCES candidates(id) ON DELETE CASCADE,
      filename VARCHAR(255) NOT NULL,
      file_path VARCHAR(500) NOT NULL,
      file_type VARCHAR(100),
      raw_text TEXT,
      parsed_data JSONB DEFAULT '{}',
      quality_score INTEGER DEFAULT 0,
      duplicate_hash VARCHAR(64),
      is_duplicate BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS applications (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
      candidate_id UUID REFERENCES candidates(id) ON DELETE CASCADE,
      resume_id UUID REFERENCES resumes(id) ON DELETE SET NULL,
      match_score INTEGER DEFAULT 0,
      skill_gap JSONB DEFAULT '[]',
      matched_skills JSONB DEFAULT '[]',
      score_breakdown JSONB DEFAULT '{}',
      status VARCHAR(50) DEFAULT 'applied',
      pipeline_stage VARCHAR(100) DEFAULT 'screening',
      interview_questions JSONB DEFAULT '[]',
      notes TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(job_id, candidate_id)
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      message TEXT NOT NULL,
      is_read BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_resumes_user_id ON resumes(user_id);
    CREATE INDEX IF NOT EXISTS idx_applications_job_id ON applications(job_id);
    CREATE INDEX IF NOT EXISTS idx_applications_candidate_id ON applications(candidate_id);
    CREATE INDEX IF NOT EXISTS idx_jobs_user_id ON jobs(user_id);
    CREATE INDEX IF NOT EXISTS idx_candidates_user_id ON candidates(user_id);
    CREATE INDEX IF NOT EXISTS idx_notifications_user_id_created_at ON notifications(user_id, created_at DESC);
  `);
  logger.info('✅ Database migrations completed');
};

const query = (text, params) => pool.query(text, params);

const getClient = () => pool.connect();

module.exports = { connectDB, query, getClient, pool };
