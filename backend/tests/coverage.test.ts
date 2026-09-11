import { checkCoverage, generateWithCoverageLoop } from '../src/services/coverage.service';
import { ExtractedRequirement } from '../src/services/llm.service';
import * as generationService from '../src/services/generation.service';

// Mock the entire generation service
jest.mock('../src/services/generation.service', () => {
  const original = jest.requireActual('../src/services/generation.service');
  return {
    ...original,
    generateQuestionsAndFlashcards: jest.fn()
  };
});

describe('Coverage Service', () => {
  const reqs: ExtractedRequirement[] = [
    { id: 'r1', text: 'React', kind: 'technical', priority: 'must' },
    { id: 'r2', text: 'Node', kind: 'technical', priority: 'nice' },
    { id: 'r3', text: 'AWS', kind: 'domain', priority: 'must' }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('checkCoverage (pure function)', () => {
    it('returns empty array when all requirements are covered', () => {
      const questions: any[] = [
        { requirement_ids: ['r1', 'r2'] },
        { requirement_ids: ['r3'] }
      ];
      expect(checkCoverage(reqs, questions)).toEqual([]);
    });

    it('returns uncovered IDs when missing', () => {
      const questions: any[] = [
        { requirement_ids: ['r1'] }
      ];
      // r2 and r3 are missing
      expect(checkCoverage(reqs, questions)).toEqual(['r2', 'r3']);
    });
  });

  describe('generateWithCoverageLoop', () => {
    const mockGenerate = generationService.generateQuestionsAndFlashcards as jest.Mock;

    it('1. Gap Closed on Pass 2 (with ID Collision check)', async () => {
      // Pass 1 returns questions for r1 and r2 only
      mockGenerate.mockResolvedValueOnce({
        questions: [
          { id: 'q1', requirement_ids: ['r1'] },
          { id: 'q2', requirement_ids: ['r2'] }
        ],
        flashcards: [
          { id: 'f1', requirement_ids: ['r1'] }
        ]
      });

      // Pass 2 returns a question for r3, but uses colliding IDs
      mockGenerate.mockResolvedValueOnce({
        questions: [
          { id: 'q1', requirement_ids: ['r3'] } // COLLISION!
        ],
        flashcards: [
          { id: 'f1', requirement_ids: ['r3'] } // COLLISION!
        ]
      });

      const result = await generateWithCoverageLoop(reqs, { about: [], hiring: [] });

      // Assert it took 2 passes
      expect(result.coverage.passes).toBe(2);
      expect(result.coverage.uncovered_requirement_ids).toEqual([]);
      
      // Assert IDs were re-indexed to prevent collision
      expect(result.questions.length).toBe(3);
      expect(result.questions[2].id).toBe('q3'); // Renamed from q1
      expect(result.questions[2].requirement_ids).toEqual(['r3']);

      expect(result.flashcards.length).toBe(2);
      expect(result.flashcards[1].id).toBe('f2'); // Renamed from f1
    });

    it('2. Un-coverable Requirement (honest reporting)', async () => {
      // Both passes refuse to generate a question for r3
      mockGenerate.mockResolvedValue({
        questions: [
          { id: 'q1', requirement_ids: ['r1', 'r2'] }
        ],
        flashcards: []
      });

      const result = await generateWithCoverageLoop(reqs, { about: [], hiring: [] });

      expect(result.coverage.passes).toBe(2);
      expect(result.coverage.uncovered_requirement_ids).toEqual(['r3']); // Truthfully reported
    });

    it('3. Perfect First Pass', async () => {
      // Pass 1 perfectly covers everything
      mockGenerate.mockResolvedValueOnce({
        questions: [
          { id: 'q1', requirement_ids: ['r1', 'r2', 'r3'] }
        ],
        flashcards: []
      });

      const result = await generateWithCoverageLoop(reqs, { about: [], hiring: [] });

      expect(result.coverage.passes).toBe(1);
      expect(result.coverage.uncovered_requirement_ids).toEqual([]);
      expect(mockGenerate).toHaveBeenCalledTimes(1); // Didn't run a second pass
    });

    it('4. Zero-Requirements Edge Case', async () => {
      const result = await generateWithCoverageLoop([], { about: [], hiring: [] });

      expect(result.coverage.passes).toBe(1);
      expect(result.coverage.uncovered_requirement_ids).toEqual([]);
      expect(mockGenerate).toHaveBeenCalledTimes(0); // Zero LLM calls
    });
  });
});
