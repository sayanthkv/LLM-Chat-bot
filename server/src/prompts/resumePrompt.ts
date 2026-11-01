// server/src/prompts/resumePrompt.ts

export const RESUME_SYSTEM_INSTRUCTION = `
You are an expert AI Resume Data Extractor.
Extract candidate details into a clean, structured JSON object matching this blueprint:
{
  "candidateName": string (at least 2 chars),
  "email": string or null,
  "phone": string or null,
  "location": string or null,
  "summary": string or null (under 500 chars),
  "experienceLevel": strictly one of ["ENTRY", "MID", "SENIOR", "LEAD"],
  "technicalSkills": array of non-empty strings (at least 1 required),
  "workExperience": array of objects with "company", "role", "startDate" (optional), "endDate" (optional), "keyHighlights" (at least 1 highlight),
  "education": array of objects with "institution", "degree", "graduationYear" (integer year or null)
}

RULES:
1. Experience Level mapping:
   - "ENTRY": 0 to 2 years
   - "MID": 3 to 5 years
   - "SENIOR": 6 to 9 years
   - "LEAD": 10+ years or Lead/Principal titles
2. Convert date strings into simple formats (e.g., "2023-01", "2024", or "Present").
3. Do NOT invent information. Missing optional fields must be null or omitted.
4. Output raw JSON only.
`;

// Real-world few-shot demonstrations
export const FEW_SHOT_EXAMPLES = [
  // Example 1: Entry-level candidate with messy text
  {
    input: `
Hey, I'm Maya Patel! Email: maya.p@example.com. Bengaluru, India.
I just graduated and have been working for 8 months as an Associate Frontend Dev at PixelCraft (Oct 2023 - Present).
Main tasks: Built responsive landing pages in React and fixed CSS bugs across browsers.
Skills: HTML5, CSS3, JavaScript, React, Git.
Education: BCA from Yenepoya University in 2023.
    `.trim(),
    output: JSON.stringify({
      candidateName: "Maya Patel",
      email: "maya.p@example.com",
      phone: null,
      location: "Bengaluru, India",
      summary: "Frontend developer with 8 months of experience specializing in React and responsive UI design.",
      experienceLevel: "ENTRY",
      technicalSkills: ["HTML5", "CSS3", "JavaScript", "React", "Git"],
      workExperience: [
        {
          company: "PixelCraft",
          role: "Associate Frontend Dev",
          startDate: "2023-10",
          endDate: "Present",
          keyHighlights: [
            "Built responsive landing pages using React.",
            "Diagnosed and resolved cross-browser CSS layout issues."
          ]
        }
      ],
      education: [
        {
          institution: "Yenepoya University",
          degree: "Bachelor of Computer Applications (BCA)",
          graduationYear: 2023
        }
      ]
    })
  },
  // Example 2: Senior engineer with no graduation year and multiple roles
  {
    input: `
Marcus Vance | +1-415-555-0192 | Seattle, WA
Summary: Senior backend engineer with 7 years architecting distributed systems and microservices.
Tech: Go, Python, PostgreSQL, Redis, Kubernetes, AWS, Kafka

Career:
- Lead Backend Engineer @ CloudFlow Inc (2021 - Present)
  * Designed event-driven Kafka pipeline processing 10M events/day.
  * Mentored 5 junior engineers and led code review standards.
- Software Engineer @ DataCore (2017 - 2021)
  * Built RESTful APIs using Python/FastAPI and PostgreSQL.

School:
University of Washington - B.S. in Computer Engineering
    `.trim(),
    output: JSON.stringify({
      candidateName: "Marcus Vance",
      email: null,
      phone: "+1-415-555-0192",
      location: "Seattle, WA",
      summary: "Senior backend engineer with 7 years architecting distributed systems and microservices.",
      experienceLevel: "SENIOR",
      technicalSkills: ["Go", "Python", "PostgreSQL", "Redis", "Kubernetes", "AWS", "Kafka"],
      workExperience: [
        {
          company: "CloudFlow Inc",
          role: "Lead Backend Engineer",
          startDate: "2021",
          endDate: "Present",
          keyHighlights: [
            "Designed event-driven Kafka pipeline processing 10M events/day.",
            "Mentored 5 junior engineers and led code review standards."
          ]
        },
        {
          company: "DataCore",
          role: "Software Engineer",
          startDate: "2017",
          endDate: "2021",
          keyHighlights: [
            "Built RESTful APIs using Python/FastAPI and PostgreSQL."
          ]
        }
      ],
      education: [
        {
          institution: "University of Washington",
          degree: "B.S. in Computer Engineering",
          graduationYear: null
        }
      ]
    })
  }
];