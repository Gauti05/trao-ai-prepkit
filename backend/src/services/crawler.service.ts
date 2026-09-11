import { fetchAndClean } from './retrieval.service';
import axios from 'axios';

export interface CrawlResult {
  about: string[]; // Content of about pages
  hiring: string[] | null; // Content of hiring pages, or null if none found
  pagesUsed: string[]; // URLs that were successfully fetched
  skipped: { url: string; code: string }[]; // URLs that failed
}

interface ScoredLink {
  url: string;
  score: number;
}

const HIRING_KEYWORDS = ['career', 'job', 'hiring', 'role', 'team', 'join', 'culture', 'engineering', 'greenhouse', 'lever'];
const ABOUT_KEYWORDS = ['about', 'story', 'mission', 'who-we-are', 'company'];
const PENALTY_KEYWORDS = ['login', 'signin', 'terms', 'privacy', 'legal', 'support', 'contact'];

function scoreUrl(urlStr: string): number {
  let score = 0;
  const urlLower = urlStr.toLowerCase();

  // Basic path depth penalty
  const pathParts = new URL(urlStr).pathname.split('/').filter(Boolean);
  score -= pathParts.length * 2; 

  // Keyword scoring
  if (HIRING_KEYWORDS.some(kw => urlLower.includes(kw))) {
    score += 50;
  } else if (ABOUT_KEYWORDS.some(kw => urlLower.includes(kw))) {
    score += 20;
  }

  // Penalties
  if (PENALTY_KEYWORDS.some(kw => urlLower.includes(kw))) {
    score -= 100;
  }

  return score;
}

function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function crawlCompanySite(baseUrl: string, maxPages = 8, timeBudgetMs = 45000): Promise<CrawlResult> {
  const startTime = Date.now();
  const visited = new Set<string>();
  const queue: ScoredLink[] = [{ url: baseUrl, score: 100 }]; // Start at homepage

  const result: CrawlResult = {
    about: [],
    hiring: null,
    pagesUsed: [],
    skipped: []
  };

  while (queue.length > 0 && result.pagesUsed.length < maxPages) {
    // Enforce time budget
    if (Date.now() - startTime > timeBudgetMs) {
      console.warn(`Time budget of ${timeBudgetMs}ms exceeded. Stopping crawl early.`);
      break;
    }

    // Sort queue descending and pop highest score
    queue.sort((a, b) => b.score - a.score);
    const { url } = queue.shift()!;

    if (visited.has(url)) continue;
    visited.add(url);

    // Rate limiting delay
    if (result.pagesUsed.length > 0 || result.skipped.length > 0) {
      await delay(300);
    }

    // Fetch with backoff
    let fetchRes;
    let attempt = 0;
    const maxAttempts = 3; // Initial + 2 retries

    while (attempt < maxAttempts) {
      fetchRes = await fetchAndClean(url);
      
      if (fetchRes.ok) {
        break; // Success
      }

      // Hard failures that shouldn't be retried
      if (fetchRes.code === 'NOT_FOUND' || fetchRes.code === 'ROBOTS_DISALLOWED' || fetchRes.code === 'PRIVATE_IP_BLOCKED' || fetchRes.code === 'INVALID_CONTENT_TYPE' || fetchRes.code === 'TOO_LARGE') {
        break;
      }

      attempt++;
      if (attempt < maxAttempts) {
        // Exponential backoff
        await delay(Math.pow(2, attempt) * 500);
      }
    }

    if (!fetchRes || !fetchRes.ok) {
      result.skipped.push({ url, code: fetchRes?.code || 'FETCH_ERROR' });
      continue;
    }

    // Categorize
    const urlLower = url.toLowerCase();
    const isHiring = HIRING_KEYWORDS.some(kw => urlLower.includes(kw));
    
    if (isHiring) {
      if (!result.hiring) result.hiring = [];
      result.hiring.push(fetchRes.text!);
    } else {
      result.about.push(fetchRes.text!);
    }

    result.pagesUsed.push(url);

    // Add new links to queue
    if (fetchRes.links) {
      for (const link of fetchRes.links) {
        // Only crawl same origin
        try {
          const parsedTarget = new URL(link);
          const parsedBase = new URL(baseUrl);
          if (parsedTarget.hostname === parsedBase.hostname && !visited.has(link)) {
            queue.push({ url: link, score: scoreUrl(link) });
          }
        } catch {
          // ignore invalid URLs
        }
      }
    }
  }

  return result;
}

export async function searchPublicDiscussion(companyName: string): Promise<string[]> {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) {
    console.warn('TAVILY_API_KEY not set. Returning empty discussion.');
    return [];
  }

  const query = `${companyName} interview process OR interview questions site:glassdoor.com OR site:reddit.com OR site:teamblind.com`;
  
  try {
    const response = await axios.post('https://api.tavily.com/search', {
      api_key: apiKey,
      query,
      search_depth: 'basic',
      include_raw_content: false,
      max_results: 3
    }, { timeout: 10000 });

    if (!response.data || !response.data.results || response.data.results.length === 0) {
      return []; // Honest zero-result
    }

    // Extract snippets as context
    const discussions = response.data.results.map((r: any) => `Source: ${r.url}\n${r.content}`);
    return discussions;

  } catch (error) {
    console.warn(`Tavily search failed for ${companyName}`, error);
    // Silent fail returning empty array per spec Section 10 "Return an empty array with no error if nothing is found"
    return [];
  }
}
