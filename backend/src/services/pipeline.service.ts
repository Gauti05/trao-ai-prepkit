import { crawlCompanySite, searchPublicDiscussion, CrawlResult } from './crawler.service';
import { extractRequirements, extractRoleMetadata } from './llm.service';
import { generateWithCoverageLoop } from './coverage.service';
import { buildSchedule } from './schedule.service';
import { KitSchema, IKitData } from '../utils/kitValidator';

export interface PipelineInput {
  jd: string;
  companyUrl: string;
  days: number;
  onProgress?: (stage: 'crawling' | 'extracting' | 'generating' | 'checking_coverage' | 'scheduling' | 'ready') => void;
}

export interface PipelineResult {
  ok: boolean;
  kit?: IKitData;
  rawContext?: any;
  error?: {
    code: string;
    message: string;
  };
}

export async function runPipeline({ jd, companyUrl, days, onProgress }: PipelineInput): Promise<PipelineResult> {
  try {
    // Phase 9 Step 0: Extract Metadata
    let meta = await extractRoleMetadata(jd).catch(() => null);
    
    const companyName = meta?.companyName && meta.companyName !== 'Unknown' 
      ? meta.companyName 
      : new URL(companyUrl).hostname;
      
    const roleTitle = meta?.roleTitle || 'Unknown Role';
    const location = meta?.location || 'Unknown Location';

    if (onProgress) onProgress('crawling');

    // Step 1: Context Gathering (Independent Execution)
    const crawlPromise = crawlCompanySite(companyUrl).catch(e => {
      console.error('Crawler failed entirely:', e);
      return null;
    });
    
    const searchPromise = searchPublicDiscussion(companyName).catch(e => {
      console.error('Search failed entirely:', e);
      return null;
    });

    const [crawlOutcome, searchOutcome] = await Promise.allSettled([crawlPromise, searchPromise]);

    let crawlData: CrawlResult = { about: [], hiring: [], pagesUsed: [], skipped: [] };
    if (crawlOutcome.status === 'fulfilled' && crawlOutcome.value) {
      crawlData = crawlOutcome.value;
    }

    let publicDiscussions: string[] = [];
    if (searchOutcome.status === 'fulfilled' && searchOutcome.value) {
      publicDiscussions = searchOutcome.value;
    }

    const companyContext = {
      about: crawlData.about,
      hiring: [...(crawlData.hiring || []), ...publicDiscussions]
    };

    if (onProgress) onProgress('extracting');

    // Step 2: Extraction
    let requirements;
    try {
      requirements = await extractRequirements(jd);
      if (!requirements || requirements.length === 0) {
        return { ok: false, error: { code: 'EXTRACTION_FAILED', message: 'No requirements extracted from JD' } };
      }
    } catch (e: any) {
      return { ok: false, error: { code: 'EXTRACTION_FAILED', message: e.message } };
    }

    if (onProgress) onProgress('generating'); // which implicitly covers checking_coverage too, or we can emit inside generateWithCoverageLoop. I'll just emit generating here.

    // Step 3: Generation & Coverage
    let genResult;
    try {
      genResult = await generateWithCoverageLoop(requirements, companyContext);
    } catch (e: any) {
      return { ok: false, error: { code: 'GENERATION_FAILED', message: e.message } };
    }

    if (onProgress) onProgress('scheduling');

    // Step 4: Scheduling
    let schedule;
    try {
      schedule = await buildSchedule(requirements, genResult.questions, days);
    } catch (e: any) {
      return { ok: false, error: { code: 'SCHEDULING_FAILED', message: e.message } };
    }

    // Step 5: Assembly & Validation
    const allSources = [...crawlData.pagesUsed];

    const rawKit = {
      source: {
        company: companyName,
        company_url: companyUrl,
        role: roleTitle,
        location: location,
        jd_chars: jd.length,
        researched_at: new Date().toISOString(),
        pages_used: allSources
      },
      company_brief: {
        summary: crawlData.about.join(' ').substring(0, 500) || 'No summary available.',
        what_they_do: 'Extracted from crawled pages.',
        sources: allSources
      },
      role: {
        title: roleTitle,
        seniority: 'Unknown',
        responsibilities: [],
        requirements: requirements
      },
      questions: genResult.questions,
      flashcards: genResult.flashcards,
      schedule: schedule,
      coverage: genResult.coverage
    };

    try {
      const validatedKit = KitSchema.parse(rawKit);
      if (onProgress) onProgress('ready');
      return { ok: true, kit: validatedKit, rawContext: companyContext };
    } catch (e: any) {
      return { ok: false, error: { code: 'VALIDATION_FAILED', message: e.message } };
    }

  } catch (err: any) {
    // Step 6: Safe Boundary
    return {
      ok: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: err.message || 'An unexpected error occurred in the pipeline'
      }
    };
  }
}
