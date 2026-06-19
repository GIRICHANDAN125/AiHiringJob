const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

const hasDatabaseConfig = Boolean(
  process.env.DB_HOST ||
  process.env.DB_PORT ||
  process.env.DB_NAME ||
  process.env.DB_USER ||
  process.env.DB_PASSWORD ||
  process.env.DATABASE_URL
);

const poolConfig = process.env.DATABASE_URL
  ? {
      uri: process.env.DATABASE_URL,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      dateStrings: true,
      multipleStatements: true,
    }
  : {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT, 10) || 3306,
      database: process.env.DB_NAME || 'aihiringjob',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      dateStrings: true,
      multipleStatements: true,
    };

const pool = mysql.createPool(poolConfig);

let dbConnected = false;

const normalizeResult = (result) => {
  if (Array.isArray(result)) {
    return { rows: result };
  }

  return {
    rows: [],
    ...result,
  };
};

const query = async (text, params = []) => {
  const [result] = await pool.execute(text, params);
  return normalizeResult(result);
};

const getClient = () => pool.getConnection();

const connectDB = async () => {
  const connection = await pool.getConnection();
  try {
    await connection.execute('SELECT 1');
    dbConnected = true;
    logger.info(`✅ MySQL connected (${process.env.DATABASE_URL ? 'URL' : 'HOST'})`);
    await runMigrations(connection);
  } finally {
    connection.release();
  }
};

const markDbDisconnected = () => {
  dbConnected = false;
};

const isDatabaseConnected = () => dbConnected;

const schemaTables = ['uploaded_files', 'notifications', 'applications', 'resumes', 'jobs', 'candidates', 'recruiters', 'users'];

const tableDefinitions = [
  {
    name: 'users',
    sql: `CREATE TABLE IF NOT EXISTS users (
      id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) NOT NULL UNIQUE,
      password_hash VARCHAR(255) NOT NULL,
      role VARCHAR(50) DEFAULT 'recruiter',
      is_verified TINYINT(1) DEFAULT 0,
      otp_code VARCHAR(6),
      otp_expires_at DATETIME NULL,
      refresh_token TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  },
  {
    name: 'recruiters',
    sql: `CREATE TABLE IF NOT EXISTS recruiters (
      id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY,
      user_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL UNIQUE,
      company_name VARCHAR(255),
      job_title VARCHAR(255),
      website VARCHAR(500),
      location VARCHAR(255),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      CONSTRAINT fk_recruiters_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  },
  {
    name: 'candidates',
    sql: `CREATE TABLE IF NOT EXISTS candidates (
      id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY,
      user_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255),
      phone VARCHAR(50),
      location VARCHAR(255),
      skills JSON,
      experience_years INT DEFAULT 0,
      education JSON,
      summary TEXT,
      linkedin_url VARCHAR(500),
      github_url VARCHAR(500),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uniq_candidate_user_email (user_id, email),
      CONSTRAINT fk_candidates_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  },
  {
    name: 'jobs',
    sql: `CREATE TABLE IF NOT EXISTS jobs (
      id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY,
      user_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
      title VARCHAR(255) NOT NULL,
      description TEXT,
      required_skills JSON,
      nice_to_have_skills JSON,
      experience_min INT DEFAULT 0,
      experience_max INT DEFAULT 10,
      education_level VARCHAR(100),
      location VARCHAR(255),
      employment_type VARCHAR(50) DEFAULT 'full-time',
      status VARCHAR(50) DEFAULT 'active',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      CONSTRAINT fk_jobs_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  },
  {
    name: 'resumes',
    sql: `CREATE TABLE IF NOT EXISTS resumes (
      id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY,
      user_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
      candidate_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
      filename VARCHAR(255) NOT NULL,
      file_path VARCHAR(500) NOT NULL,
      file_type VARCHAR(100),
      raw_text LONGTEXT,
      parsed_data JSON,
      quality_score INT DEFAULT 0,
      duplicate_hash VARCHAR(64),
      is_duplicate TINYINT(1) DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uniq_resume_duplicate (user_id, duplicate_hash),
      CONSTRAINT fk_resumes_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      CONSTRAINT fk_resumes_candidate FOREIGN KEY (candidate_id) REFERENCES candidates(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  },
  {
    name: 'applications',
    sql: `CREATE TABLE IF NOT EXISTS applications (
      id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY,
      job_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
      candidate_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
      resume_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
      match_score INT DEFAULT 0,
      skill_gap JSON,
      matched_skills JSON,
      score_breakdown JSON,
      status VARCHAR(50) DEFAULT 'applied',
      pipeline_stage VARCHAR(100) DEFAULT 'screening',
      interview_questions JSON,
      notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uniq_job_candidate (job_id, candidate_id),
      CONSTRAINT fk_applications_job FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE,
      CONSTRAINT fk_applications_candidate FOREIGN KEY (candidate_id) REFERENCES candidates(id) ON DELETE CASCADE,
      CONSTRAINT fk_applications_resume FOREIGN KEY (resume_id) REFERENCES resumes(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  },
  {
    name: 'uploaded_files',
    sql: `CREATE TABLE IF NOT EXISTS uploaded_files (
      id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY,
      user_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
      candidate_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
      resume_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
      original_name VARCHAR(255) NOT NULL,
      file_name VARCHAR(255) NOT NULL,
      file_path VARCHAR(500) NOT NULL,
      file_type VARCHAR(100),
      file_size INT DEFAULT 0,
      duplicate_hash VARCHAR(64),
      is_duplicate TINYINT(1) DEFAULT 0,
      parsed_data JSON,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT fk_uploaded_files_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      CONSTRAINT fk_uploaded_files_candidate FOREIGN KEY (candidate_id) REFERENCES candidates(id) ON DELETE SET NULL,
      CONSTRAINT fk_uploaded_files_resume FOREIGN KEY (resume_id) REFERENCES resumes(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  },
  {
    name: 'notifications',
    sql: `CREATE TABLE IF NOT EXISTS notifications (
      id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY,
      user_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
      message TEXT NOT NULL,
      is_read TINYINT(1) DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT fk_notifications_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  },
];

const indexStatements = [
  'CREATE INDEX idx_resumes_user_id ON resumes(user_id)',
  'CREATE INDEX idx_applications_job_id ON applications(job_id)',
  'CREATE INDEX idx_applications_candidate_id ON applications(candidate_id)',
  'CREATE INDEX idx_jobs_user_id ON jobs(user_id)',
  'CREATE INDEX idx_candidates_user_id ON candidates(user_id)',
  'CREATE INDEX idx_notifications_user_id_created_at ON notifications(user_id, created_at)',
];

const logSqlError = (stepLabel, statement, error) => {
  logger.error(`Schema step failed: ${stepLabel}`);
  logger.error(`SQL: ${statement}`);
  logger.error(`MySQL error code=${error.code} errno=${error.errno} sqlState=${error.sqlState} message=${error.sqlMessage || error.message}`);
};

const getTableHealth = async (connection) => {
  const [rows] = await connection.query(
    `SHOW TABLE STATUS WHERE Name IN (${schemaTables.map(() => '?').join(', ')})`,
    schemaTables
  );
  return rows;
};

const isCorruptTableStatus = (row) => {
  if (!row) return false;
  if (!row.Engine) return true;
  const comment = String(row.Comment || '');
  return comment.includes("doesn't exist in engine") || comment.includes('error in foreign key constraint');
};

const resetSchema = async (connection) => {
  logger.warn('Detected broken schema state, rebuilding tables from scratch');
  await connection.query('SET FOREIGN_KEY_CHECKS = 0');
  try {
    await connection.query(`DROP TABLE IF EXISTS ${schemaTables.join(', ')}`);
  } finally {
    await connection.query('SET FOREIGN_KEY_CHECKS = 1');
  }
};

const cleanupOrphanFiles = async (connection) => {
  const [rows] = await connection.query('SELECT @@datadir as datadir');
  const dataDir = rows[0]?.datadir;
  const databaseName = process.env.DB_NAME || 'aihiringjob';

  if (!dataDir) {
    return;
  }

  const extensions = ['.frm', '.ibd', '.cfg', '.sdi'];
  for (const tableName of schemaTables) {
    for (const extension of extensions) {
      const filePath = path.join(dataDir, databaseName, `${tableName}${extension}`);
      if (fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath);
          logger.warn(`Removed orphan table file: ${filePath}`);
        } catch (error) {
          logger.warn(`Could not remove orphan table file ${filePath}: ${error.message}`);
        }
      }
    }
  }
};

const createSchema = async (connection) => {
  for (const [index, definition] of tableDefinitions.entries()) {
    try {
      logger.info(`Running schema step ${index + 1}/${tableDefinitions.length}: ${definition.name}`);
      await connection.query(definition.sql);
    } catch (error) {
      logSqlError(definition.name, definition.sql, error);
      throw error;
    }
  }

  for (const [index, statement] of indexStatements.entries()) {
    try {
      logger.info(`Running index step ${index + 1}/${indexStatements.length}`);
      await connection.query(statement);
    } catch (error) {
      if (error.code === 'ER_DUP_KEYNAME') {
        continue;
      }
      logSqlError(`index-${index + 1}`, statement, error);
      throw error;
    }
  }
};

const runMigrations = async (connection) => {
  const tableHealth = await getTableHealth(connection);
  if (tableHealth.some(isCorruptTableStatus)) {
    await resetSchema(connection);
  }

  try {
    await createSchema(connection);
  } catch (error) {
    if (error.code === 'ER_TABLESPACE_EXISTS' || error.code === 'ER_CANT_CREATE_TABLE' || error.errno === 1813) {
      await resetSchema(connection);
      await cleanupOrphanFiles(connection);
      await createSchema(connection);
    } else {
      throw error;
    }
  }

  const finalHealth = await getTableHealth(connection);
  const missingTables = schemaTables.filter((tableName) => !finalHealth.some((row) => row.Name === tableName));
  if (missingTables.length) {
    throw new Error(`Schema verification failed, missing tables: ${missingTables.join(', ')}`);
  }

  logger.info('✅ MySQL schema ensured');
};

module.exports = {
  connectDB,
  query,
  getClient,
  pool,
  hasDatabaseConfig,
  isDatabaseConnected,
  markDbDisconnected,
};
