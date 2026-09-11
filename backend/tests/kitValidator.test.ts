import { KitSchema } from '../src/utils/kitValidator';

const validBaseKit = {
  source: {
    company: "Acme Corp",
    company_url: "https://acme.com",
    role: "Software Engineer",
    location: "Remote",
    jd_chars: 1000,
    researched_at: "2026-09-10T12:00:00Z",
    pages_used: ["https://acme.com/careers"]
  },
  company_brief: {
    summary: "Acme makes anvils.",
    what_they_do: "Manufacturing",
    sources: ["https://acme.com/about"]
  },
  role: {
    title: "Software Engineer",
    seniority: "Mid-level",
    responsibilities: ["Write code"],
    requirements: [
      { id: "r1", text: "React experience", kind: "technical", priority: "must" },
      { id: "r2", text: "Communication", kind: "behavioural", priority: "nice" }
    ]
  },
  questions: [
    { id: "q1", requirement_ids: ["r1"], category: "technical", prompt: "Explain React", answer_outline: "Hooks", difficulty: 2 },
    { id: "q2", requirement_ids: ["r2"], category: "behavioural", prompt: "Tell me a time", answer_outline: "STAR", difficulty: 1 }
  ],
  flashcards: [
    { id: "f1", front: "What is useState?", back: "A hook", requirement_ids: ["r1"] }
  ],
  schedule: {
    days_available: 2,
    days: [
      { day: 1, focus: "React", question_ids: ["q1"], minutes: 60 },
      { day: 2, focus: "Behavioral", question_ids: ["q2"], minutes: 45 }
    ]
  },
  coverage: {
    uncovered_requirement_ids: [],
    passes: 1
  }
};

describe('KitSchema Zod Validator', () => {
  
  it('1. Passes validation with a valid kit', () => {
    const result = KitSchema.safeParse(validBaseKit);
    expect(result.success).toBe(true);
  });

  it('2. Fails when a required field is missing', () => {
    const invalidKit = JSON.parse(JSON.stringify(validBaseKit));
    delete invalidKit.role.title;
    
    const result = KitSchema.safeParse(invalidKit);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toContain('title');
    }
  });

  it('3. Fails when schedule references non-existent question_id', () => {
    const invalidKit = JSON.parse(JSON.stringify(validBaseKit));
    invalidKit.schedule.days[0].question_ids.push("q-missing");
    
    const result = KitSchema.safeParse(invalidKit);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain('references unknown question_id: q-missing');
    }
  });

  it('4. Fails when question references non-existent requirement_id', () => {
    const invalidKit = JSON.parse(JSON.stringify(validBaseKit));
    invalidKit.questions[0].requirement_ids.push("r-missing");
    
    const result = KitSchema.safeParse(invalidKit);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain('references unknown requirement_id: r-missing');
    }
  });

  it('5. Fails when flashcard references non-existent requirement_id', () => {
    const invalidKit = JSON.parse(JSON.stringify(validBaseKit));
    invalidKit.flashcards[0].requirement_ids.push("r-missing");
    
    const result = KitSchema.safeParse(invalidKit);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain('references unknown requirement_id: r-missing');
    }
  });

  it('6. Fails when coverage references non-existent requirement_id', () => {
    const invalidKit = JSON.parse(JSON.stringify(validBaseKit));
    invalidKit.coverage.uncovered_requirement_ids.push("r-missing");
    
    const result = KitSchema.safeParse(invalidKit);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain('references unknown uncovered_requirement_id: r-missing');
    }
  });

  it('7. Fails when schedule minutes is a float', () => {
    const invalidKit = JSON.parse(JSON.stringify(validBaseKit));
    invalidKit.schedule.days[0].minutes = 45.5; // Float instead of Int
    
    const result = KitSchema.safeParse(invalidKit);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message.toLowerCase()).toContain('expected int');
    }
  });

  it('8. Fails when difficulty is out of bounds', () => {
    const invalidKitHigh = JSON.parse(JSON.stringify(validBaseKit));
    invalidKitHigh.questions[0].difficulty = 5; 
    
    let result = KitSchema.safeParse(invalidKitHigh);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message.toLowerCase()).toContain('expected number to be <=3');
    }

    const invalidKitLow = JSON.parse(JSON.stringify(validBaseKit));
    invalidKitLow.questions[0].difficulty = 0; 
    
    result = KitSchema.safeParse(invalidKitLow);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message.toLowerCase()).toContain('expected number to be >=1');
    }
  });
});
