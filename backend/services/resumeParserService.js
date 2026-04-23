const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

// Comprehensive skills database
const SKILLS_DATABASE = [
  // Programming Languages
  'javascript', 'typescript', 'python', 'java', 'c++', 'c#', 'go', 'rust', 'ruby', 'php',
  'swift', 'kotlin', 'scala', 'r', 'matlab', 'perl', 'lua', 'dart', 'elixir', 'haskell',
  // Frontend
  'react', 'vue', 'angular', 'svelte', 'nextjs', 'next.js', 'nuxtjs', 'gatsby', 'redux',
  'html', 'css', 'sass', 'scss', 'tailwind', 'bootstrap', 'materialui', 'webpack', 'vite',
  // Backend
  'nodejs', 'node.js', 'express', 'fastapi', 'django', 'flask', 'spring', 'laravel', 'rails',
  'graphql', 'rest', 'grpc', 'websocket', 'microservices', 'nestjs',
  // Databases
  'postgresql', 'mysql', 'mongodb', 'redis', 'elasticsearch', 'cassandra', 'sqlite',
  'dynamodb', 'firebase', 'supabase', 'clickhouse', 'neo4j', 'influxdb',
  // Cloud & DevOps
  'aws', 'gcp', 'azure', 'docker', 'kubernetes', 'terraform', 'ansible', 'jenkins',
  'github actions', 'circleci', 'helm', 'nginx', 'linux', 'bash', 'ci/cd',
  // Data & ML
  'machine learning', 'deep learning', 'tensorflow', 'pytorch', 'scikit-learn', 'pandas',
  'numpy', 'spark', 'hadoop', 'kafka', 'airflow', 'mlops', 'nlp', 'computer vision',
  'data science', 'tableau', 'power bi', 'looker',
  // Mobile
  'react native', 'flutter', 'ios', 'android', 'xamarin',
  // Tools
  'git', 'jira', 'confluence', 'figma', 'postman', 'swagger', 'agile', 'scrum',
  'solid principles', 'design patterns', 'tdd', 'bdd',
];

const parseResume = async (filePath, mimeType) => {
  let rawText = '';

  try {
    if (mimeType === 'application/pdf') {
      rawText = await parsePDF(filePath);
    } else if (
      mimeType === 'application/msword' ||
      mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ) {
      rawText = await parseDOCX(filePath);
    } else {
      rawText = fs.readFileSync(filePath, 'utf-8');
    }
  } catch (err) {
    logger.warn(`Could not parse file ${filePath}: ${err.message}`);
    rawText = '';
  }

  const parsedData = extractInfo(rawText);
  parsedData.rawText = rawText;
  return parsedData;
};

const parsePDF = async (filePath) => {
  try {
    const pdfParse = require('pdf-parse');
    const dataBuffer = fs.readFileSync(filePath);
    const data = await pdfParse(dataBuffer);
    return data.text;
  } catch (err) {
    logger.warn('PDF parse error:', err.message);
    return '';
  }
};

const parseDOCX = async (filePath) => {
  try {
    const mammoth = require('mammoth');
    const result = await mammoth.extractRawText({ path: filePath });
    return result.value;
  } catch (err) {
    logger.warn('DOCX parse error:', err.message);
    return '';
  }
};

const extractInfo = (text) => {
  const lowerText = text.toLowerCase();

  return {
    name: extractName(text),
    email: extractEmail(text),
    phone: extractPhone(text),
    location: extractLocation(text),
    skills: extractSkills(lowerText),
    experienceYears: extractExperienceYears(text),
    education: extractEducation(text),
    summary: extractSummary(text),
    linkedinUrl: extractLinkedIn(text),
    githubUrl: extractGitHub(text),
  };
};

const extractEmail = (text) => {
  const match = text.match(/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/);
  return match ? match[0].toLowerCase() : null;
};

const extractPhone = (text) => {
  const match = text.match(/(\+?[\d\s\-().]{10,17})/);
  return match ? match[0].trim() : null;
};

const extractName = (text) => {
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  // First non-empty line is usually the name
  const firstLine = lines[0];
  if (firstLine && firstLine.length < 60 && /^[A-Za-z\s.'-]+$/.test(firstLine)) {
    return firstLine;
  }
  // Try second line
  const secondLine = lines[1];
  if (secondLine && secondLine.length < 60 && /^[A-Za-z\s.'-]+$/.test(secondLine)) {
    return secondLine;
  }
  return null;
};

const extractLocation = (text) => {
  const locationPatterns = [
    /(?:location|address|city)[:\s]+([^\n,]+(?:,\s*[^\n]+)?)/i,
    /([A-Za-z\s]+,\s*[A-Z]{2}\s*\d{5})/,
    /([A-Za-z\s]+,\s*[A-Za-z\s]+,\s*[A-Za-z\s]+)/,
  ];

  for (const pattern of locationPatterns) {
    const match = text.match(pattern);
    if (match) return match[1].trim();
  }
  return null;
};

const extractSkills = (lowerText) => {
  const foundSkills = [];

  for (const skill of SKILLS_DATABASE) {
    const regex = new RegExp(`\\b${skill.replace(/[.+]/g, '\\$&')}\\b`, 'i');
    if (regex.test(lowerText)) {
      // Normalize skill name
      const normalized = skill.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
      foundSkills.push(normalized);
    }
  }

  return [...new Set(foundSkills)];
};

const extractExperienceYears = (text) => {
  const patterns = [
    /(\d+)\+?\s*years?\s+of\s+(?:professional\s+)?experience/i,
    /experience[:\s]+(\d+)\+?\s*years?/i,
    /(\d+)\+?\s*years?\s+(?:of\s+)?(?:work|professional|industry)/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return parseInt(match[1]);
  }

  // Try to infer from date ranges
  const yearMatches = text.match(/\b(19|20)\d{2}\b/g);
  if (yearMatches && yearMatches.length >= 2) {
    const years = yearMatches.map(Number).sort();
    const earliest = years[0];
    const latest = Math.max(...years);
    const currentYear = new Date().getFullYear();
    const calculated = Math.min(latest, currentYear) - earliest;
    if (calculated > 0 && calculated < 50) return calculated;
  }

  return 0;
};

const extractEducation = (text) => {
  const education = [];
  const degrees = [
    'phd', 'ph.d', 'doctorate',
    'master', 'm.s.', 'mba', 'm.tech', 'm.e.',
    'bachelor', 'b.s.', 'b.e.', 'b.tech', 'b.a.', 'b.com',
    'associate', 'diploma', 'certificate',
  ];

  const lines = text.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].toLowerCase();
    const found = degrees.find(d => line.includes(d));
    if (found) {
      education.push({
        degree: lines[i].trim(),
        institution: lines[i + 1] ? lines[i + 1].trim() : '',
      });
    }
  }

  return education.slice(0, 5);
};

const extractSummary = (text) => {
  const summaryPatterns = [
    /(?:summary|objective|profile|about\s+me)[:\n]\s*([^\n]{50,500})/i,
    /(?:professional\s+summary)[:\n]\s*([^\n]{50,500})/i,
  ];

  for (const pattern of summaryPatterns) {
    const match = text.match(pattern);
    if (match) return match[1].trim();
  }

  // Use first substantial paragraph
  const paragraphs = text.split('\n\n').filter(p => p.trim().length > 100);
  if (paragraphs.length > 0) return paragraphs[0].trim().substring(0, 300);

  return null;
};

const extractLinkedIn = (text) => {
  const match = text.match(/linkedin\.com\/in\/([a-zA-Z0-9\-]+)/i);
  return match ? `https://linkedin.com/in/${match[1]}` : null;
};

const extractGitHub = (text) => {
  const match = text.match(/github\.com\/([a-zA-Z0-9\-]+)/i);
  return match ? `https://github.com/${match[1]}` : null;
};

const calculateQualityScore = (parsedData) => {
  let score = 0;

  if (parsedData.name) score += 10;
  if (parsedData.email) score += 15;
  if (parsedData.phone) score += 10;
  if (parsedData.location) score += 5;
  if (parsedData.summary) score += 10;
  if (parsedData.linkedinUrl) score += 5;
  if (parsedData.githubUrl) score += 5;

  // Skills scoring
  const skillCount = parsedData.skills?.length || 0;
  if (skillCount >= 15) score += 20;
  else if (skillCount >= 10) score += 15;
  else if (skillCount >= 5) score += 10;
  else if (skillCount > 0) score += 5;

  // Education scoring
  if (parsedData.education?.length > 0) score += 10;

  // Experience scoring
  if (parsedData.experienceYears > 0) score += 10;

  return Math.min(score, 100);
};

module.exports = { parseResume, calculateQualityScore, SKILLS_DATABASE };
