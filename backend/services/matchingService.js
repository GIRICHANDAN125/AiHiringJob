/**
 * Matching Service
 * Calculates match scores between candidates and jobs with explainable scoring.
 */

const calculateMatch = (candidate, job) => {
  const candidateSkills = normalizeSkills(candidate.skills || []);
  const requiredSkills = normalizeSkills(job.required_skills || []);
  const niceSkills = normalizeSkills(job.nice_to_have_skills || []);

  // 1. Required skills match (50% weight)
  const { matched: matchedRequired, missing: missingRequired } = compareSkills(candidateSkills, requiredSkills);
  const requiredScore = requiredSkills.length > 0
    ? (matchedRequired.length / requiredSkills.length) * 50
    : 50;

  // 2. Nice-to-have skills match (20% weight)
  const { matched: matchedNice } = compareSkills(candidateSkills, niceSkills);
  const niceScore = niceSkills.length > 0
    ? (matchedNice.length / niceSkills.length) * 20
    : 20;

  // 3. Experience match (20% weight)
  const expScore = calculateExperienceScore(
    candidate.experience_years || 0,
    job.experience_min || 0,
    job.experience_max || 10
  );

  // 4. Education match (10% weight)
  const eduScore = calculateEducationScore(
    candidate.education || [],
    job.education_level
  );

  const totalScore = Math.round(requiredScore + niceScore + expScore + eduScore);

  const allMatchedSkills = [
    ...matchedRequired.map(s => ({ skill: s, type: 'required' })),
    ...matchedNice.map(s => ({ skill: s, type: 'nice_to_have' })),
  ];

  return {
    score: Math.min(totalScore, 100),
    matchedSkills: allMatchedSkills,
    skillGap: missingRequired,
    breakdown: {
      requiredSkills: { score: Math.round(requiredScore), max: 50, matched: matchedRequired.length, total: requiredSkills.length },
      niceToHaveSkills: { score: Math.round(niceScore), max: 20, matched: matchedNice.length, total: niceSkills.length },
      experience: { score: Math.round(expScore), max: 20, years: candidate.experience_years || 0 },
      education: { score: Math.round(eduScore), max: 10 },
    },
  };
};

const normalizeSkills = (skills) => {
  if (!skills) return [];
  if (typeof skills === 'string') {
    try { skills = JSON.parse(skills); } catch { return []; }
  }
  return skills.map(s => s.toLowerCase().trim());
};

const compareSkills = (candidateSkills, jobSkills) => {
  const matched = [];
  const missing = [];

  for (const jobSkill of jobSkills) {
    const isMatch = candidateSkills.some(cs => {
      if (cs === jobSkill) return true;
      // Fuzzy matching for similar skills
      if (cs.includes(jobSkill) || jobSkill.includes(cs)) return true;
      // Common aliases
      const aliases = getAliases(jobSkill);
      return aliases.some(alias => cs.includes(alias) || alias.includes(cs));
    });

    if (isMatch) {
      matched.push(jobSkill);
    } else {
      missing.push(jobSkill);
    }
  }

  return { matched, missing };
};

const getAliases = (skill) => {
  const aliasMap = {
    'javascript': ['js', 'ecmascript', 'es6', 'es2015'],
    'typescript': ['ts'],
    'nodejs': ['node.js', 'node js'],
    'react': ['reactjs', 'react.js'],
    'vue': ['vuejs', 'vue.js'],
    'postgresql': ['postgres', 'psql'],
    'mongodb': ['mongo'],
    'kubernetes': ['k8s'],
    'machine learning': ['ml'],
    'artificial intelligence': ['ai'],
    'nextjs': ['next.js'],
  };

  return aliasMap[skill] || [];
};

const calculateExperienceScore = (candidateYears, minYears, maxYears) => {
  if (candidateYears >= minYears && candidateYears <= maxYears + 2) {
    return 20; // Perfect match
  }
  if (candidateYears >= minYears) {
    return 15; // Over-qualified but fine
  }
  if (candidateYears >= minYears - 1) {
    return 10; // Just under
  }
  if (candidateYears > 0) {
    return 5; // Some experience
  }
  return 0;
};

const calculateEducationScore = (education, requiredLevel) => {
  if (!requiredLevel) return 10;

  const levelMap = {
    'high school': 1,
    'associate': 2,
    'bachelor': 3,
    'master': 4,
    'phd': 5,
  };

  const required = levelMap[requiredLevel?.toLowerCase()] || 3;
  const hasHigherOrEqual = education.some(edu => {
    const eduText = (edu.degree || '').toLowerCase();
    for (const [level, rank] of Object.entries(levelMap)) {
      if (eduText.includes(level) && rank >= required) return true;
    }
    return false;
  });

  return hasHigherOrEqual ? 10 : education.length > 0 ? 5 : 0;
};

const getRecommendation = (score) => {
  if (score >= 80) return { label: 'Strongly Recommended', color: 'green', icon: '⭐' };
  if (score >= 65) return { label: 'Recommended', color: 'blue', icon: '👍' };
  if (score >= 45) return { label: 'Consider', color: 'yellow', icon: '🤔' };
  return { label: 'Not Recommended', color: 'red', icon: '❌' };
};

module.exports = { calculateMatch, getRecommendation };
