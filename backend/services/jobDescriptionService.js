/**
 * Job Description Generator Service
 */

const generate = ({ title, requiredSkills = [], niceToHaveSkills = [], experienceMin = 0, experienceMax = 5, employmentType = 'full-time', location = 'Remote' }) => {
  const expRange = experienceMin === experienceMax
    ? `${experienceMin}+ years`
    : `${experienceMin}-${experienceMax} years`;

  return `## About the Role

We are looking for a talented and motivated **${title}** to join our growing team. In this role, you will be working on challenging problems and contributing to innovative solutions that make a real difference.

## What You'll Do

- Design, develop, and maintain high-quality software solutions
- Collaborate with cross-functional teams including product, design, and QA
- Participate in code reviews and contribute to technical decisions
- Write clean, well-documented, and testable code
- Help mentor junior team members and contribute to team knowledge sharing
- Identify and resolve performance bottlenecks and technical debt

## Required Skills & Experience

- **${expRange} of professional experience** in relevant roles
${requiredSkills.map(s => `- Strong proficiency in **${s}**`).join('\n')}
- Experience with agile/scrum development methodologies
- Strong problem-solving skills and attention to detail
- Excellent communication and collaboration skills

${niceToHaveSkills.length > 0 ? `## Nice to Have

${niceToHaveSkills.map(s => `- Experience with ${s}`).join('\n')}
` : ''}
## What We Offer

- Competitive salary and equity package
- ${employmentType === 'full-time' ? 'Full-time position' : employmentType} — ${location}
- Flexible working hours and remote-friendly culture
- Health, dental, and vision insurance
- Professional development budget
- Annual team retreats and team-building events
- Opportunity to work on impactful products with a talented team

## About Us

We are a fast-growing company dedicated to building world-class products. Our team values innovation, collaboration, and continuous learning. Join us and help shape the future!

---

*We are an equal opportunity employer and celebrate diversity. We are committed to creating an inclusive environment for all employees.*`;
};

module.exports = { generate };
