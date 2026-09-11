import { generateQuestionsAndFlashcards } from '../src/services/generation.service';
import nock from 'nock';

describe('Generation Service - generateQuestionsAndFlashcards', () => {
  beforeEach(() => {
    nock.cleanAll();
    jest.restoreAllMocks();
    process.env.GROQ_API_KEY = 'test_groq_key';
  });

  afterAll(() => {
    nock.restore();
  });

  it('1. Sequential execution with valid schemas', async () => {
    // Mock the technical prompt
    nock('https://api.groq.com')
      .post('/openai/v1/chat/completions', (body) => body.messages[0].content.includes('technical interviewer'))
      .reply(200, {
        choices: [{
          message: {
            content: JSON.stringify({
              questions: [{ id: 'q1', requirement_ids: ['r1'], category: 'technical', prompt: 'Tech Q', answer_outline: 'A', difficulty: 2 }],
              flashcards: [{ id: 'f1', requirement_ids: ['r1'], front: 'F', back: 'B' }]
            })
          }
        }]
      });

    // Mock the behavioural prompt
    nock('https://api.groq.com')
      .post('/openai/v1/chat/completions', (body) => body.messages[0].content.includes('HR interviewer'))
      .reply(200, {
        choices: [{
          message: {
            content: JSON.stringify({
              questions: [{ id: 'q2', requirement_ids: ['r2'], category: 'behavioural', prompt: 'Beh Q', answer_outline: 'A', difficulty: 1 }],
              flashcards: [{ id: 'f2', requirement_ids: ['r2'], front: 'F', back: 'B' }]
            })
          }
        }]
      });

    const reqs = [
      { id: 'r1', text: 'React', kind: 'technical' as const, priority: 'must' as const },
      { id: 'r2', text: 'Teamwork', kind: 'behavioural' as const, priority: 'nice' as const }
    ];

    const result = await generateQuestionsAndFlashcards(reqs, { about: [], hiring: [] });

    expect(result.questions.length).toBe(2);
    expect(result.flashcards.length).toBe(2);
    expect(result.questions.some(q => q.category === 'technical')).toBe(true);
    expect(result.questions.some(q => q.category === 'behavioural')).toBe(true);
  });

  it('2. Referential integrity self-healing (hallucinated ID retry)', async () => {
    // Attempt 1: Hallucinates r99
    nock('https://api.groq.com')
      .post('/openai/v1/chat/completions')
      .reply(200, {
        choices: [{
          message: {
            content: JSON.stringify({
              questions: [{ id: 'q1', requirement_ids: ['r99'], category: 'technical', prompt: 'Tech Q', answer_outline: 'A', difficulty: 2 }],
              flashcards: []
            })
          }
        }]
      });

    // Attempt 2: Corrects to r1 (and the prompt must contain the error string)
    nock('https://api.groq.com')
      .post('/openai/v1/chat/completions', (body) => body.messages[1].content.includes('Only use IDs from this list: [r1]'))
      .reply(200, {
        choices: [{
          message: {
            content: JSON.stringify({
              questions: [{ id: 'q1', requirement_ids: ['r1'], category: 'technical', prompt: 'Tech Q', answer_outline: 'A', difficulty: 2 }],
              flashcards: []
            })
          }
        }]
      });

    const reqs = [{ id: 'r1', text: 'React', kind: 'technical' as const, priority: 'must' as const }];
    const result = await generateQuestionsAndFlashcards(reqs, { about: [], hiring: [] });

    expect(result.questions.length).toBe(1);
    expect(result.questions[0].requirement_ids).toEqual(['r1']);
  });

  it('3. Empty group skipping', async () => {
    // Only one requirement (technical). Behavioural and Domain should NOT trigger network calls.
    nock('https://api.groq.com')
      .post('/openai/v1/chat/completions')
      .reply(200, {
        choices: [{
          message: {
            content: JSON.stringify({ questions: [], flashcards: [] })
          }
        }]
      }); // Only 1 mock expected. If it tries to call twice, nock will throw.

    const reqs = [{ id: 'r1', text: 'React', kind: 'technical' as const, priority: 'must' as const }];
    const result = await generateQuestionsAndFlashcards(reqs, { about: [], hiring: [] });

    expect(nock.isDone()).toBe(true);
  });

  it('4. Context truncation limit', async () => {
    nock('https://api.groq.com')
      .post('/openai/v1/chat/completions', (body) => {
        // Assert the prompt length doesn't exceed ~4000 characters (3000 context + overhead)
        return body.messages[1].content.length < 4000;
      })
      .reply(200, {
        choices: [{
          message: {
            content: JSON.stringify({ questions: [], flashcards: [] })
          }
        }]
      });

    const reqs = [{ id: 'r1', text: 'React', kind: 'technical' as const, priority: 'must' as const }];
    
    // Massive context (50000 characters)
    const massiveContext = {
      about: ['a'.repeat(25000)],
      hiring: ['b'.repeat(25000)]
    };

    await generateQuestionsAndFlashcards(reqs, massiveContext);
    
    expect(nock.isDone()).toBe(true);
  });
});
