import { ExtractedRequirement } from './llm.service';
import { GeneratedQuestion, GeneratedFlashcard, generateQuestionsAndFlashcards, GenerationResult } from './generation.service';

export interface CoverageResult {
  uncovered_requirement_ids: string[];
  passes: number;
}

export interface GenerationWithCoverageResult {
  questions: GeneratedQuestion[];
  flashcards: GeneratedFlashcard[];
  coverage: CoverageResult;
}

export function checkCoverage(requirements: ExtractedRequirement[], questions: GeneratedQuestion[]): string[] {
  const coveredIds = new Set<string>();
  
  for (const q of questions) {
    for (const reqId of q.requirement_ids) {
      coveredIds.add(reqId);
    }
  }

  const uncovered: string[] = [];
  for (const r of requirements) {
    if (!coveredIds.has(r.id)) {
      uncovered.push(r.id);
    }
  }

  return uncovered;
}

function reindexItems(
  items: any[], 
  prefix: string, 
  startIndex: number
) {
  let currentIndex = startIndex;
  for (const item of items) {
    item.id = `${prefix}${currentIndex}`;
    currentIndex++;
  }
  return currentIndex;
}

export async function generateWithCoverageLoop(
  requirements: ExtractedRequirement[],
  companyContext: { about: string[], hiring: string[] }
): Promise<GenerationWithCoverageResult> {
  // Edge case: zero requirements
  if (!requirements || requirements.length === 0) {
    return {
      questions: [],
      flashcards: [],
      coverage: {
        uncovered_requirement_ids: [],
        passes: 1
      }
    };
  }

  const maxPasses = 2;
  let currentPass = 1;

  // Pass 1: All requirements
  const pass1Result = await generateQuestionsAndFlashcards(requirements, companyContext);
  
  const masterQuestions = [...pass1Result.questions];
  const masterFlashcards = [...pass1Result.flashcards];

  let uncovered = checkCoverage(requirements, masterQuestions);

  if (uncovered.length > 0 && currentPass < maxPasses) {
    currentPass++;
    
    // Pass 2: Only uncovered requirements
    const uncoveredReqs = requirements.filter(r => uncovered.includes(r.id));
    const pass2Result = await generateQuestionsAndFlashcards(uncoveredReqs, companyContext);
    
    // ID Collision Prevention: Re-index Pass 2 outputs
    // We assume IDs are usually q1, q2... and f1, f2... 
    // To be perfectly safe against collisions, we just rewrite them entirely based on the master array length
    
    reindexItems(pass2Result.questions, 'q', masterQuestions.length + 1);
    reindexItems(pass2Result.flashcards, 'f', masterFlashcards.length + 1);

    masterQuestions.push(...pass2Result.questions);
    masterFlashcards.push(...pass2Result.flashcards);
    
    // Final check
    uncovered = checkCoverage(requirements, masterQuestions);
  }

  return {
    questions: masterQuestions,
    flashcards: masterFlashcards,
    coverage: {
      uncovered_requirement_ids: uncovered,
      passes: currentPass
    }
  };
}
