import { runPipeline } from '../src/services/pipeline.service';
import * as crawlerService from '../src/services/crawler.service';
import * as llmService from '../src/services/llm.service';
import * as coverageService from '../src/services/coverage.service';
import * as scheduleService from '../src/services/schedule.service';

jest.mock('../src/services/crawler.service');
jest.mock('../src/services/llm.service');
jest.mock('../src/services/coverage.service');
jest.mock('../src/services/schedule.service');

describe('Pipeline Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const validJd = 'Fake JD';
  const validUrl = 'http://example.com';
  
  const mockReqs = [{ id: 'r1', text: 'React', kind: 'technical', priority: 'must' }];
  const mockQuestions = [{ id: 'q1', requirement_ids: ['r1'], category: 'technical', prompt: 'Q', answer_outline: 'A', difficulty: 2 }];
  const mockFlashcards = [{ id: 'f1', requirement_ids: ['r1'], front: 'F', back: 'B' }];
  const mockSchedule = {
    days_available: 1,
    days: [{ day: 1, focus: 'Tech', question_ids: ['q1'], minutes: 30 }]
  };

  function setupMocks() {
    (crawlerService.crawlCompanySite as jest.Mock).mockResolvedValue({
      about: ['About info'], hiring: ['Hiring info'], pagesUsed: ['http://example.com/about'], skipped: []
    });
    (crawlerService.searchPublicDiscussion as jest.Mock).mockResolvedValue(['Forum post']);
    
    (llmService.extractRoleMetadata as jest.Mock).mockResolvedValue({
      companyName: 'Test Corp', roleTitle: 'Engineer', location: 'Remote'
    });
    (llmService.extractRequirements as jest.Mock).mockResolvedValue(mockReqs);
    
    (coverageService.generateWithCoverageLoop as jest.Mock).mockResolvedValue({
      questions: mockQuestions,
      flashcards: mockFlashcards,
      coverage: { uncovered_requirement_ids: [], passes: 1 }
    });
    
    (scheduleService.buildSchedule as jest.Mock).mockReturnValue(mockSchedule);
  }

  it('1. Perfect Integration Pass', async () => {
    setupMocks();

    const res = await runPipeline({ jd: validJd, companyUrl: validUrl, days: 1 });

    expect(res.ok).toBe(true);
    expect(res.kit).toBeDefined();
    expect(res.kit?.source.company).toBe('Test Corp');
    expect(res.kit?.source.jd_chars).toBe(validJd.length);
    expect(res.kit?.questions).toEqual(mockQuestions);
  });

  it('2. Partial Context Degradation', async () => {
    setupMocks();
    
    // Crawl throws, search succeeds
    (crawlerService.crawlCompanySite as jest.Mock).mockRejectedValue(new Error('500 Error'));
    (crawlerService.searchPublicDiscussion as jest.Mock).mockResolvedValue(['Search Result']);

    const res = await runPipeline({ jd: validJd, companyUrl: validUrl, days: 1 });

    expect(res.ok).toBe(true); // Should survive
    expect(res.kit?.source.pages_used).toEqual([]); // Empty because crawler failed and search doesn't return URLs in this mock setup
  });

  it('3. Extraction Failure Short-Circuit', async () => {
    setupMocks();
    
    (llmService.extractRequirements as jest.Mock).mockRejectedValue(new Error('LLM Down'));

    const res = await runPipeline({ jd: validJd, companyUrl: validUrl, days: 1 });

    expect(res.ok).toBe(false);
    expect(res.error?.code).toBe('EXTRACTION_FAILED');
  });

  it('4. Validation Firewall', async () => {
    setupMocks();
    
    // Schedule has an invalid question_id 'q99' which isn't in questions
    (scheduleService.buildSchedule as jest.Mock).mockReturnValue({
      days_available: 1,
      days: [{ day: 1, focus: 'Tech', question_ids: ['q99'], minutes: 30 }]
    });

    const res = await runPipeline({ jd: validJd, companyUrl: validUrl, days: 1 });

    expect(res.ok).toBe(false);
    expect(res.error?.code).toBe('VALIDATION_FAILED');
  });
});
