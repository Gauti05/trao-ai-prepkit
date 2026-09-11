import { z } from 'zod';

export const SourceSchema = z.object({
  company: z.string(),
  company_url: z.string().url(),
  role: z.string(),
  location: z.string(),
  jd_chars: z.number().int(),
  researched_at: z.string(),
  pages_used: z.array(z.string().url())
});

export const CompanyBriefSchema = z.object({
  summary: z.string(),
  what_they_do: z.string(),
  sources: z.array(z.string().url())
});

export const RequirementSchema = z.object({
  id: z.string(),
  text: z.string(),
  kind: z.enum(['technical', 'behavioural', 'domain']),
  priority: z.enum(['must', 'nice']),
});

export const RoleSchema = z.object({
  title: z.string(),
  seniority: z.string(),
  responsibilities: z.array(z.string()),
  requirements: z.array(RequirementSchema)
});

export const QuestionSchema = z.object({
  id: z.string(),
  requirement_ids: z.array(z.string()),
  category: z.enum(['technical', 'behavioural', 'system-design', 'company-fit']),
  prompt: z.string(),
  answer_outline: z.string(),
  difficulty: z.number().int().min(1).max(3)
});

export const FlashcardSchema = z.object({
  id: z.string(),
  front: z.string(),
  back: z.string(),
  requirement_ids: z.array(z.string()),
  confidence: z.enum(['uncovered', 'low', 'medium', 'high']).optional().default('uncovered')
});

export const ScheduleDaySchema = z.object({
  day: z.number().int(),
  focus: z.string(),
  question_ids: z.array(z.string()),
  minutes: z.number().int()
});

export const ScheduleSchema = z.object({
  days_available: z.number().int(),
  days: z.array(ScheduleDaySchema)
});

export const CoverageSchema = z.object({
  uncovered_requirement_ids: z.array(z.string()),
  passes: z.number().int()
});

const BaseKitSchema = z.object({
  source: SourceSchema,
  company_brief: CompanyBriefSchema,
  role: RoleSchema,
  questions: z.array(QuestionSchema),
  flashcards: z.array(FlashcardSchema),
  schedule: ScheduleSchema,
  coverage: CoverageSchema
});

export const KitSchema = BaseKitSchema.superRefine((data, ctx) => {
  const reqIds = new Set(data.role.requirements.map(r => r.id));
  const questionIds = new Set(data.questions.map(q => q.id));

  // 1. Every question_id in schedule.days must exist in questions
  for (let i = 0; i < data.schedule.days.length; i++) {
    const day = data.schedule.days[i];
    for (let j = 0; j < day.question_ids.length; j++) {
      const qId = day.question_ids[j];
      if (!questionIds.has(qId)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Schedule day ${day.day} references unknown question_id: ${qId}`,
          path: ['schedule', 'days', i, 'question_ids', j]
        });
      }
    }
  }

  // 2. Every requirement_id in questions must exist in role.requirements
  for (let i = 0; i < data.questions.length; i++) {
    const q = data.questions[i];
    for (let j = 0; j < q.requirement_ids.length; j++) {
      const rId = q.requirement_ids[j];
      if (!reqIds.has(rId)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Question ${q.id} references unknown requirement_id: ${rId}`,
          path: ['questions', i, 'requirement_ids', j]
        });
      }
    }
  }

  // 3. Every requirement_id in flashcards must exist in role.requirements
  for (let i = 0; i < data.flashcards.length; i++) {
    const f = data.flashcards[i];
    for (let j = 0; j < f.requirement_ids.length; j++) {
      const rId = f.requirement_ids[j];
      if (!reqIds.has(rId)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Flashcard ${f.id} references unknown requirement_id: ${rId}`,
          path: ['flashcards', i, 'requirement_ids', j]
        });
      }
    }
  }

  // 4. Every requirement_id in coverage.uncovered_requirement_ids must exist in role.requirements
  for (let i = 0; i < data.coverage.uncovered_requirement_ids.length; i++) {
    const rId = data.coverage.uncovered_requirement_ids[i];
    if (!reqIds.has(rId)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Coverage references unknown uncovered_requirement_id: ${rId}`,
        path: ['coverage', 'uncovered_requirement_ids', i]
      });
    }
  }
});

export type IKitData = z.infer<typeof KitSchema>;
