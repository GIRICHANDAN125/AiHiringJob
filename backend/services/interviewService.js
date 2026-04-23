/**
 * Interview Question Generator Service
 * Generates role-specific, tailored interview questions based on candidate & job data.
 */

const questionBank = {
  behavioral: [
    { q: "Tell me about a time you faced a significant technical challenge. How did you overcome it?", category: "Problem Solving" },
    { q: "Describe a situation where you had to work with a difficult team member. What was the outcome?", category: "Teamwork" },
    { q: "Give an example of a project where you had to learn a new technology quickly.", category: "Learning Agility" },
    { q: "Tell me about a time you failed. What did you learn from it?", category: "Self-Awareness" },
    { q: "Describe a time when you had to meet a tight deadline. How did you manage it?", category: "Time Management" },
    { q: "Tell me about a time you disagreed with your manager's decision. How did you handle it?", category: "Communication" },
    { q: "Give an example of when you took initiative beyond your job description.", category: "Leadership" },
    { q: "Describe a situation where you had to explain a complex technical concept to a non-technical audience.", category: "Communication" },
  ],

  technical: {
    javascript: [
      "Explain the difference between `let`, `const`, and `var` in JavaScript.",
      "What is the event loop in JavaScript and how does it work?",
      "Explain closures and give a practical use case.",
      "What is the difference between `==` and `===`?",
      "How does async/await work under the hood?",
    ],
    typescript: [
      "What are generics in TypeScript and when would you use them?",
      "Explain the difference between `interface` and `type` in TypeScript.",
      "What are decorators and how are they used?",
      "How does TypeScript's type inference work?",
    ],
    react: [
      "Explain the React component lifecycle.",
      "What is the difference between `useMemo` and `useCallback`?",
      "How does React's reconciliation algorithm work?",
      "Explain the Context API and when to use it vs Redux.",
      "What are React hooks and what problems do they solve?",
    ],
    python: [
      "What are Python decorators and how do you use them?",
      "Explain the difference between a list and a generator.",
      "What is the GIL (Global Interpreter Lock) in Python?",
      "How does Python's memory management work?",
    ],
    nodejs: [
      "How does Node.js handle concurrency despite being single-threaded?",
      "Explain the difference between `process.nextTick()` and `setImmediate()`.",
      "What is the difference between `require()` and `import` in Node.js?",
      "How do you handle memory leaks in Node.js?",
    ],
    postgresql: [
      "What is the difference between an index and a primary key?",
      "Explain ACID properties in databases.",
      "What is a database transaction and why is it important?",
      "How do you optimize a slow SQL query?",
    ],
    aws: [
      "What is the difference between EC2 and Lambda?",
      "Explain the concept of auto-scaling in AWS.",
      "What are S3 storage classes and when would you use each?",
      "How does AWS IAM work?",
    ],
    docker: [
      "What is the difference between a Docker image and a container?",
      "Explain Docker networking modes.",
      "What are multi-stage builds in Docker and why are they useful?",
    ],
    kubernetes: [
      "What is the difference between a Pod, Deployment, and Service in Kubernetes?",
      "Explain how Kubernetes handles rolling updates.",
      "What is a ConfigMap vs a Secret in Kubernetes?",
      "How does Kubernetes handle load balancing?",
    ],
    'machine learning': [
      "Explain the difference between supervised and unsupervised learning.",
      "What is overfitting and how do you prevent it?",
      "Explain the concept of gradient descent.",
      "What is cross-validation and why is it important?",
    ],
  },

  situational: [
    "If you joined our team and found that the codebase has no tests, what would you do?",
    "How would you approach building a system that needs to handle 10x more traffic than expected?",
    "If you discovered a critical security vulnerability in production, what steps would you take?",
    "How would you handle a situation where a feature request from a stakeholder conflicts with technical best practices?",
    "If you inherited a legacy codebase with poor documentation, how would you get up to speed?",
  ],

  culture: [
    "How do you stay updated with the latest trends and technologies in your field?",
    "What kind of work environment helps you do your best work?",
    "Where do you see yourself in 3-5 years?",
    "What motivates you to come to work every day?",
    "How do you handle constructive criticism?",
  ],
};

const generateQuestions = (candidate, job, application) => {
  const candidateSkills = normalizeArray(candidate.skills).map(s => s.toLowerCase());
  const jobSkills = normalizeArray(job.required_skills).map(s => s.toLowerCase());
  const skillGap = application ? normalizeArray(application.skill_gap) : [];

  const questions = [];

  // 1. Behavioral questions (always 3)
  const shuffledBehavioral = shuffle([...questionBank.behavioral]);
  questions.push(...shuffledBehavioral.slice(0, 3).map(q => ({
    type: 'Behavioral',
    category: q.category,
    question: q.q,
  })));

  // 2. Technical questions based on matched skills (3-5)
  const technicalQuestions = [];
  for (const skill of jobSkills) {
    const skillKey = Object.keys(questionBank.technical).find(k => skill.includes(k) || k.includes(skill));
    if (skillKey && questionBank.technical[skillKey]) {
      const qs = shuffle([...questionBank.technical[skillKey]]).slice(0, 2);
      qs.forEach(q => technicalQuestions.push({
        type: 'Technical',
        category: skillKey.charAt(0).toUpperCase() + skillKey.slice(1),
        question: q,
      }));
    }
  }
  questions.push(...technicalQuestions.slice(0, 5));

  // 3. Skill gap questions (if any gaps)
  if (skillGap.length > 0) {
    questions.push({
      type: 'Skill Assessment',
      category: 'Gap Analysis',
      question: `We noticed ${skillGap.slice(0, 3).join(', ')} ${skillGap.length > 3 ? 'and others are' : 'is'} listed as requirements. How would you approach learning these skills quickly?`,
    });
  }

  // 4. Situational questions (2)
  const shuffledSituational = shuffle([...questionBank.situational]);
  questions.push(...shuffledSituational.slice(0, 2).map(q => ({
    type: 'Situational',
    category: 'Problem Solving',
    question: q,
  })));

  // 5. Culture fit (2)
  const shuffledCulture = shuffle([...questionBank.culture]);
  questions.push(...shuffledCulture.slice(0, 2).map(q => ({
    type: 'Culture Fit',
    category: 'Soft Skills',
    question: q,
  })));

  // Add job-specific intro question
  questions.unshift({
    type: 'Opening',
    category: 'Introduction',
    question: `Can you walk me through your background and what interests you most about this ${job.title} role?`,
  });

  return questions;
};

const normalizeArray = (arr) => {
  if (!arr) return [];
  if (typeof arr === 'string') {
    try { return JSON.parse(arr); } catch { return []; }
  }
  return arr;
};

const shuffle = (arr) => {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};

module.exports = { generateQuestions };
