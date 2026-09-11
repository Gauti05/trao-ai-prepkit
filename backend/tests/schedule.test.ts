import { buildSchedule } from '../src/services/schedule.service';
import { ExtractedRequirement } from '../src/services/llm.service';
import { GeneratedQuestion } from '../src/services/generation.service';

describe('Schedule Service - buildSchedule', () => {
  const reqs: ExtractedRequirement[] = [
    { id: 'r1', text: 'React', kind: 'technical', priority: 'must' },
    { id: 'r2', text: 'Node', kind: 'technical', priority: 'nice' },
    { id: 'r3', text: 'Team', kind: 'behavioural', priority: 'must' }
  ];

  const questions: GeneratedQuestion[] = [
    { id: 'q1', requirement_ids: ['r1'], category: 'technical', prompt: 'Q1', answer_outline: 'A1', difficulty: 2 },
    { id: 'q2', requirement_ids: ['r1'], category: 'system-design', prompt: 'Q2', answer_outline: 'A2', difficulty: 3 },
    { id: 'q3', requirement_ids: ['r2'], category: 'technical', prompt: 'Q3', answer_outline: 'A3', difficulty: 1 },
    { id: 'q4', requirement_ids: ['r3'], category: 'behavioural', prompt: 'Q4', answer_outline: 'A4', difficulty: 2 },
    { id: 'q5', requirement_ids: ['r2', 'r3'], category: 'company-fit', prompt: 'Q5', answer_outline: 'A5', difficulty: 1 }
  ];
  // Priority parsing expectation:
  // q1: must (r1), diff 2
  // q2: must (r1), diff 3
  // q3: nice (r2), diff 1
  // q4: must (r3), diff 2
  // q5: must (r3), diff 1
  // Sort order (must > nice, diff desc): q2, q1, q4, q5, q3

  it('1. Standard Spread: 5 questions over 3 days, sorted correctly', () => {
    const result = buildSchedule(reqs, questions, 3);
    
    expect(result.days_available).toBe(3);
    expect(result.days.length).toBe(3);
    
    // Day 1 should have q2 and q5 (round robin index 0 and 3)
    expect(result.days[0].question_ids).toEqual(['q2', 'q5']);
    // Day 2 should have q1 and q3 (index 1 and 4)
    expect(result.days[1].question_ids).toEqual(['q1', 'q3']);
    // Day 3 should have q4 (index 2)
    expect(result.days[2].question_ids).toEqual(['q4']);
    
    // Time checks: q2(45) + q5(15) = 60
    expect(result.days[0].minutes).toBe(60);
  });

  it('2. 1-Day Cram: Total minutes sum correctly', () => {
    const result = buildSchedule(reqs, questions, 1);
    
    expect(result.days.length).toBe(1);
    expect(result.days[0].question_ids).toEqual(['q2', 'q1', 'q4', 'q5', 'q3']);
    
    // Total minutes: 45 + 30 + 30 + 15 + 15 = 135
    expect(result.days[0].minutes).toBe(135);
  });

  it('3. 60-Day Spread: exactly 60 days, no empty, Review prefix', () => {
    const result = buildSchedule(reqs, questions, 60);
    
    expect(result.days.length).toBe(60);
    
    // First 5 days get the 5 unique questions
    expect(result.days[0].question_ids.length).toBeGreaterThan(0);
    expect(result.days[4].question_ids.length).toBeGreaterThan(0);
    expect(result.days[0].focus).not.toContain('Review:');
    
    // Day 6 (index 5) should be a recycled question and marked with Review
    expect(result.days[5].question_ids.length).toBeGreaterThan(0);
    expect(result.days[5].focus).toContain('Review:');
    
    // It should recycle the hardest must question (q2)
    expect(result.days[5].question_ids).toEqual(['q2']);
  });

  it('4. Must-Have Coverage: All must-have questions appear', () => {
    const result = buildSchedule(reqs, questions, 3);
    
    const allAssignedIds = result.days.flatMap(d => d.question_ids);
    
    // Must questions are q1, q2, q4, q5
    expect(allAssignedIds).toContain('q1');
    expect(allAssignedIds).toContain('q2');
    expect(allAssignedIds).toContain('q4');
    expect(allAssignedIds).toContain('q5');
  });

  it('5. No Must-Haves Recycled: Fallback to hardest nice questions', () => {
    const niceReqs: ExtractedRequirement[] = [
      { id: 'r1', text: 'React', kind: 'technical', priority: 'nice' }
    ];
    const niceQuestions: GeneratedQuestion[] = [
      { id: 'q1', requirement_ids: ['r1'], category: 'technical', prompt: 'Q1', answer_outline: 'A1', difficulty: 1 },
      { id: 'q2', requirement_ids: ['r1'], category: 'technical', prompt: 'Q2', answer_outline: 'A2', difficulty: 3 }
    ];

    const result = buildSchedule(niceReqs, niceQuestions, 10);
    
    expect(result.days.length).toBe(10);
    
    // First 2 days get unique questions (q2, q1 due to diff sort)
    expect(result.days[0].question_ids).toEqual(['q2']);
    expect(result.days[1].question_ids).toEqual(['q1']);
    
    // Day 3 (empty day) should recycle the hardest nice question (q2)
    expect(result.days[2].question_ids).toEqual(['q2']);
    expect(result.days[2].focus).toContain('Review:');
  });
});
