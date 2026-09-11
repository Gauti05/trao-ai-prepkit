import axios, { AxiosError, AxiosResponse } from 'axios';
import * as cheerio from 'cheerio';
import robotsParser from 'robots-parser';
import ipaddr from 'ipaddr.js';
import dns from 'dns';

export interface FetchResult {
  ok: boolean;
  code?: 'NOT_FOUND' | 'TIMEOUT' | 'ROBOTS_DISALLOWED' | 'TOO_LARGE' | 'PRIVATE_IP_BLOCKED' | 'INVALID_CONTENT_TYPE' | 'FETCH_ERROR';
  message?: string;
  text?: string;
  links?: string[];
}

const USER_AGENT = 'TraoBot/1.0';
const MAX_CONTENT_LENGTH = 5 * 1024 * 1024; // 5MB
const TIMEOUT_MS = 5000;

// Helper to check if an IP is private/loopback/link-local
function isPrivateIP(ipStr: string): boolean {
  try {
    const ip = ipaddr.parse(ipStr);
    const range = ip.range();
    return ['private', 'loopback', 'linkLocal', 'uniqueLocal', 'ipv4Mapped'].includes(range);
  } catch (e) {
    return false;
  }
}

async function resolveAndCheckIP(hostname: string): Promise<boolean> {
  if (process.env.ALLOW_PRIVATE_IPS === 'true') {
    return true;
  }
  try {
    const addresses = await dns.promises.lookup(hostname, { all: true });
    for (const record of addresses) {
      if (isPrivateIP(record.address)) {
        return false;
      }
    }
    return true;
  } catch (err) {
    return false;
  }
}

async function checkRobotsTxt(targetUrl: URL): Promise<boolean> {
  const robotsUrl = `${targetUrl.protocol}//${targetUrl.host}/robots.txt`;
  try {
    const res = await axios.get(robotsUrl, {
      timeout: TIMEOUT_MS,
      maxRedirects: 0,
      validateStatus: () => true, // Don't throw on 404
      headers: { 'User-Agent': USER_AGENT }
    });

    if (res.status === 404 || (res.status >= 500 && res.status < 600)) {
      return true; // Missing or server error -> treat as allowed
    }

    if (res.status >= 200 && res.status < 300 && typeof res.data === 'string') {
      const robots = robotsParser(robotsUrl, res.data);
      const isAllowed = robots.isAllowed(targetUrl.href, USER_AGENT);
      return isAllowed === undefined ? true : isAllowed;
    }

    return true;
  } catch (err) {
    return true; // Timeout fetching robots -> default allow
  }
}

export async function fetchAndClean(url: string, maxRedirectsLeft = 5): Promise<FetchResult> {
  try {
    let targetUrl: URL;
    try {
      targetUrl = new URL(url);
    } catch {
      return { ok: false, code: 'FETCH_ERROR', message: 'Invalid URL format' };
    }

    if (targetUrl.protocol !== 'http:' && targetUrl.protocol !== 'https:') {
      return { ok: false, code: 'FETCH_ERROR', message: 'Only http and https are allowed' };
    }

    const isPublic = await resolveAndCheckIP(targetUrl.hostname);
    if (!isPublic) {
      return { ok: false, code: 'PRIVATE_IP_BLOCKED', message: `Host resolves to a private IP: ${targetUrl.hostname}` };
    }

    const isAllowed = await checkRobotsTxt(targetUrl);
    if (!isAllowed) {
      return { ok: false, code: 'ROBOTS_DISALLOWED', message: 'Blocked by robots.txt' };
    }

    let response: AxiosResponse;
    try {
      response = await axios.get(url, {
        timeout: TIMEOUT_MS,
        maxContentLength: MAX_CONTENT_LENGTH,
        maxRedirects: 0,
        validateStatus: (status) => status >= 200 && status < 400,
        headers: { 'User-Agent': USER_AGENT },
        responseType: 'arraybuffer'
      });
    } catch (err) {
      const axiosErr = err as AxiosError;
      if (axiosErr.code === 'ECONNABORTED' || axiosErr.message.includes('timeout')) {
        return { ok: false, code: 'TIMEOUT', message: 'Request timed out' };
      }
      if (axiosErr.response && axiosErr.response.status === 404) {
        return { ok: false, code: 'NOT_FOUND', message: 'Page not found (404)' };
      }
      if (axiosErr.message.includes('maxContentLength') || axiosErr.message.includes('stream has been aborted')) {
        return { ok: false, code: 'TOO_LARGE', message: 'Response too large' };
      }
      return { ok: false, code: 'FETCH_ERROR', message: axiosErr.message };
    }

    if (response.status >= 300 && response.status < 400) {
      if (maxRedirectsLeft <= 0) {
        return { ok: false, code: 'FETCH_ERROR', message: 'Too many redirects' };
      }
      const redirectUrlStr = String(response.headers['location'] || '');
      if (!redirectUrlStr) {
        return { ok: false, code: 'FETCH_ERROR', message: 'Redirect missing location header' };
      }
      const nextUrl = new URL(redirectUrlStr, url).href;
      return fetchAndClean(nextUrl, maxRedirectsLeft - 1);
    }

    const contentType = String(response.headers['content-type'] || '');
    if (!contentType.includes('text/html')) {
      return { ok: false, code: 'INVALID_CONTENT_TYPE', message: 'Only text/html is allowed' };
    }

    const contentLength = parseInt(String(response.headers['content-length'] || '0'), 10);
    if (contentLength > MAX_CONTENT_LENGTH) {
      return { ok: false, code: 'TOO_LARGE', message: 'Response too large' };
    }

    const html = response.data.toString('utf8');
    const $ = cheerio.load(html);

    $('script, style, noscript, nav, footer, header, aside, iframe, SVG, svg').remove();
    const text = $('body').text().replace(/\s+/g, ' ').trim();

    const links = new Set<string>();
    $('a').each((_, el) => {
      const href = $(el).attr('href');
      if (href) {
        try {
          const absoluteUrl = new URL(href, targetUrl.href).href;
          if (absoluteUrl.startsWith('http')) {
            links.add(absoluteUrl);
          }
        } catch (e) {}
      }
    });

    return {
      ok: true,
      text,
      links: Array.from(links)
    };

  } catch (error: any) {
    console.log('OUTER_ERR:', error);
    return { ok: false, code: 'FETCH_ERROR', message: error.message || 'Unknown error' };
  }
}
