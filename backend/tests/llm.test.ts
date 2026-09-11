import { extractRequirements } from '../src/services/llm.service';
import nock from 'nock';

describe('LLM Service - extractRequirements', () => {
  beforeEach(() => {
    nock.cleanAll();
    jest.restoreAllMocks();
    process.env.GROQ_API_KEY = 'test_groq_key';
  });

  afterAll(() => {
    nock.restore();
  });

  it('1. Rich JD: Valid data extraction', async () => {
    nock('https://api.groq.com')
      .post('/openai/v1/chat/completions')
      .reply(200, {
        choices: [
          {
            message: {
              content: JSON.stringify({
                requirements: [
                  { id: 'r1', text: '5+ years React', kind: 'technical', priority: 'must' },
                  { id: 'r2', text: 'Team player', kind: 'behavioural', priority: 'nice' }
                ]
              })
            }
          }
        ]
      });

    const result = await extractRequirements('We need a React dev with 5 years exp. Nice to be a team player.');
    
    expect(result.length).toBe(2);
    expect(result[0].id).toBe('r1');
    expect(result[0].text).toBe('5+ years React');
    expect(result[1].kind).toBe('behavioural');
    expect(result[1].priority).toBe('nice');
  });

  it('2. Stub JD: Zero requirements gracefully handled', async () => {
    nock('https://api.groq.com')
      .post('/openai/v1/chat/completions')
      .reply(200, {
        choices: [
          {
            message: {
              content: JSON.stringify({ requirements: [] })
            }
          }
        ]
      });

    const result = await extractRequirements('We are hiring a person.');
    
    expect(result.length).toBe(0);
    expect(Array.isArray(result)).toBe(true);
  });

  it('3. Rate Limit Recovery: 429 -> 200', async () => {
    // Attempt 1: Rate limited
    nock('https://api.groq.com')
      .post('/openai/v1/chat/completions')
      .reply(429, 'Too many requests', { 'retry-after': '1' });

    // Attempt 2: Success
    nock('https://api.groq.com')
      .post('/openai/v1/chat/completions')
      .reply(200, {
        choices: [{ message: { content: JSON.stringify({ requirements: [{ id: 'r1', text: 'Valid', kind: 'domain', priority: 'must' }] }) } }]
      });

    // We can tighten the timeout for the test to pass faster if we mocked the delay, but we'll let it run for 1s
    const start = Date.now();
    const result = await extractRequirements('Need domain knowledge.');
    const end = Date.now();
    
    expect(result.length).toBe(1);
    expect(result[0].text).toBe('Valid');
    expect(end - start).toBeGreaterThanOrEqual(1000); // Proves it honored retry-after
  });

  it('4. Malformed JSON Recovery', async () => {
    // Attempt 1: Malformed JSON string
    nock('https://api.groq.com')
      .post('/openai/v1/chat/completions')
      .reply(200, {
        choices: [{ message: { content: '{ "requirements": [ { "id": "r1", "text": "Valid", "kind": "domain", "priority": "must" } ' } }] // Missing trailing bracket
      });

    // Attempt 2: Success
    nock('https://api.groq.com')
      .post('/openai/v1/chat/completions')
      .reply(200, {
        choices: [{ message: { content: JSON.stringify({ requirements: [{ id: 'r1', text: 'Valid', kind: 'domain', priority: 'must' }] }) } }]
      });

    const result = await extractRequirements('Fix my JSON');
    expect(result.length).toBe(1);
    expect(result[0].text).toBe('Valid');
  });

  it('5. Zod Shape Recovery: Invalid enum -> Valid enum', async () => {
    // Attempt 1: Invalid priority enum 'mandatory' (not 'must' or 'nice')
    nock('https://api.groq.com')
      .post('/openai/v1/chat/completions')
      .reply(200, {
        choices: [{ message: { content: JSON.stringify({ requirements: [{ id: 'r1', text: 'Valid', kind: 'domain', priority: 'mandatory' }] }) } }]
      });

    // Attempt 2: Valid
    nock('https://api.groq.com')
      .post('/openai/v1/chat/completions')
      .reply(200, {
        choices: [{ message: { content: JSON.stringify({ requirements: [{ id: 'r1', text: 'Valid', kind: 'domain', priority: 'must' }] }) } }]
      });

    const result = await extractRequirements('Fix my enum');
    expect(result.length).toBe(1);
    expect(result[0].priority).toBe('must');
  });

});
