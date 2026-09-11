import { z } from 'zod';
import { ExtractedRequirement } from './llm.service';
import { GeneratedQuestion } from './generation.service';
import { ScheduleDaySchema, ScheduleSchema } from '../utils/kitValidator';

type ScheduleDay = z.infer<typeof ScheduleDaySchema>;
type Schedule = z.infer<typeof ScheduleSchema>;

interface QuestionWithMeta extends GeneratedQuestion {
  priority: 'must' | 'nice';
  isMust: boolean;
  minutes: number;
}

function getMinutesForDifficulty(diff: number): number {
  if (diff === 3) return 45;
  if (diff === 2) return 30;
  return 15;
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function buildSchedule(
  requirements: ExtractedRequirement[],
  questions: GeneratedQuestion[],
  daysAvailable: number
): Schedule {
  // 1. Build a map of requirement priorities
  const reqPriorityMap = new Map<string, 'must' | 'nice'>();
  for (const r of requirements) {
    reqPriorityMap.set(r.id, r.priority);
  }

  // 2. Enhance questions with priority and minutes
  const enhancedQuestions: QuestionWithMeta[] = questions.map(q => {
    let isMust = false;
    for (const rId of q.requirement_ids) {
      if (reqPriorityMap.get(rId) === 'must') {
        isMust = true;
        break;
      }
    }
    
    return {
      ...q,
      priority: isMust ? 'must' : 'nice',
      isMust,
      minutes: getMinutesForDifficulty(q.difficulty)
    };
  });

  // 3. Sort: must > nice, then difficulty 3 > 1
  enhancedQuestions.sort((a, b) => {
    if (a.isMust && !b.isMust) return -1;
    if (!a.isMust && b.isMust) return 1;
    return b.difficulty - a.difficulty; // Descending
  });

  // 4. Distribute questions across available days
  const days: ScheduleDay[] = Array.from({ length: daysAvailable }, (_, i) => ({
    day: i + 1,
    focus: '',
    question_ids: [],
    minutes: 0
  }));

  // Simple round-robin distribution for primary questions
  for (let i = 0; i < enhancedQuestions.length; i++) {
    const q = enhancedQuestions[i];
    const dayIdx = i % daysAvailable;
    days[dayIdx].question_ids.push(q.id);
    days[dayIdx].minutes += q.minutes;
    if (!days[dayIdx].focus) {
      days[dayIdx].focus = capitalize(q.category) + ' Focus';
    } else if (!days[dayIdx].focus.includes(capitalize(q.category))) {
      days[dayIdx].focus += ` & ${capitalize(q.category)}`;
    }
  }

  // 5. Handle empty days (Review Recycling)
  // If there are more days than questions, some days will be empty.
  const emptyDays = days.filter(d => d.question_ids.length === 0);
  
  if (emptyDays.length > 0 && enhancedQuestions.length > 0) {
    // Find hardest must questions
    let pool = enhancedQuestions.filter(q => q.isMust);
    
    // Fallback: if no must questions exist, use hardest overall
    if (pool.length === 0) {
      pool = [...enhancedQuestions];
    }
    
    // The pool is already sorted (must > nice, then diff desc)
    let poolIdx = 0;
    
    for (const emptyDay of emptyDays) {
      const recycledQ = pool[poolIdx % pool.length];
      poolIdx++;
      
      emptyDay.question_ids.push(recycledQ.id);
      emptyDay.minutes += recycledQ.minutes;
      emptyDay.focus = `Review: ${capitalize(recycledQ.category)} Focus`;
    }
  }

  // Format any generic focus strings that got too long or weird
  for (const day of days) {
    if (!day.focus) {
      day.focus = 'General Review';
    }
  }

  return {
    days_available: daysAvailable,
    days
  };
}
