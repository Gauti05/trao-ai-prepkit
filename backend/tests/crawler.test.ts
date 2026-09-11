import { crawlCompanySite, searchPublicDiscussion } from '../src/services/crawler.service';
import nock from 'nock';
import dns from 'dns';

describe('Crawler Service - crawlCompanySite & searchPublicDiscussion', () => {
  beforeEach(() => {
    nock.cleanAll();
    jest.restoreAllMocks();
    process.env.ALLOW_PRIVATE_IPS = 'true'; // Allow nock mocks easily without strict DNS filtering failing them
    jest.spyOn(dns.promises, 'lookup').mockResolvedValue([{ address: '93.184.216.34', family: 4 }] as any);
  });

  afterAll(() => {
    nock.restore();
  });

  it('1. Standard Corporate: Homepage -> /careers is correctly categorized', async () => {
    nock('https://acme.com').get('/robots.txt').times(5).reply(404);
    
    // Homepage
    nock('https://acme.com').get('/').reply(200, `
      <html><body>
        <h1>Welcome to Acme</h1>
        <p>We do things.</p>
        <a href="/careers">Careers</a>
      </body></html>
    `, { 'content-type': 'text/html' });

    // Careers page
    nock('https://acme.com').get('/careers').reply(200, `
      <html><body>
        <h1>Careers at Acme</h1>
        <p>We are hiring engineers.</p>
      </body></html>
    `, { 'content-type': 'text/html' });

    const result = await crawlCompanySite('https://acme.com/');
    
    expect(result.pagesUsed).toContain('https://acme.com/');
    expect(result.pagesUsed).toContain('https://acme.com/careers');
    
    // Hiring array should have been created and contain the careers text
    expect(result.hiring).not.toBeNull();
    expect(result.hiring?.some(text => text.includes('We are hiring engineers'))).toBe(true);
    
    // About array should contain the homepage
    expect(result.about.some(text => text.includes('Welcome to Acme'))).toBe(true);
  });

  it('2. Buried Hiring Page: Homepage -> /engineering-blog -> /open-roles', async () => {
    nock('https://startup.io').get('/robots.txt').times(5).reply(404);
    
    // Homepage
    nock('https://startup.io').get('/').reply(200, `
      <html><body>
        <a href="/engineering-blog">Engineering Blog</a>
      </body></html>
    `, { 'content-type': 'text/html' });

    // Blog
    nock('https://startup.io').get('/engineering-blog').reply(200, `
      <html><body>
        <a href="/open-roles">Open Roles</a>
      </body></html>
    `, { 'content-type': 'text/html' });

    // Open Roles
    nock('https://startup.io').get('/open-roles').reply(200, `
      <html><body>We are hiring!</body></html>
    `, { 'content-type': 'text/html' });

    const result = await crawlCompanySite('https://startup.io/');
    
    expect(result.pagesUsed.length).toBe(3);
    expect(result.hiring).not.toBeNull();
    expect(result.hiring?.some(t => t.includes('We are hiring!'))).toBe(true);
  });

  it('3. No Hiring Page: Returns honest hiring: null', async () => {
    nock('https://small.com').get('/robots.txt').reply(404);
    
    // Homepage with no internal links
    nock('https://small.com').get('/').reply(200, `
      <html><body>Just a landing page.</body></html>
    `, { 'content-type': 'text/html' });

    const result = await crawlCompanySite('https://small.com/');
    
    expect(result.pagesUsed.length).toBe(1);
    expect(result.hiring).toBeNull(); // Honest zero-result
    expect(result.about[0]).toContain('Just a landing page');
  });

  it('4. Max Pages Cap: Stops exactly at the limit (e.g. maxPages = 3)', async () => {
    nock('https://huge.com').get('/robots.txt').times(10).reply(404);
    
    // Intercept any page on this host
    nock('https://huge.com')
      .get(/.*/)
      .times(10)
      .reply(200, (uri) => {
        // Return a page that links to 2 new pages
        const random1 = Math.floor(Math.random() * 10000);
        const random2 = Math.floor(Math.random() * 10000);
        return `
          <html><body>
            <a href="/page-${random1}">Link 1</a>
            <a href="/page-${random2}">Link 2</a>
          </body></html>
        `;
      }, { 'content-type': 'text/html' });

    // Bound maxPages to 3
    const result = await crawlCompanySite('https://huge.com/', 3);
    
    expect(result.pagesUsed.length).toBe(3);
  });

  it('5. Retry Exhaustion: 503 lands in skipped array without crashing', async () => {
    nock('https://flaky.com').get('/robots.txt').times(5).reply(404);
    
    // Homepage links to broken page
    nock('https://flaky.com').get('/').reply(200, `
      <html><body><a href="/broken">Broken</a></body></html>
    `, { 'content-type': 'text/html' });

    // The broken page fails completely 3 times (initial + 2 retries)
    nock('https://flaky.com').get('/broken').times(3).reply(503, 'Server Error', { 'content-type': 'text/html' });

    // We can tighten the timeout for the test to pass faster if we mocked the delay, but we'll let it run
    const result = await crawlCompanySite('https://flaky.com/', 8, 10000);
    
    expect(result.pagesUsed).toContain('https://flaky.com/');
    expect(result.pagesUsed).not.toContain('https://flaky.com/broken');
    
    // Must be in skipped array
    expect(result.skipped.some(s => s.url === 'https://flaky.com/broken' && s.code === 'FETCH_ERROR')).toBe(true);
  }, 15000);

  it('6. Search Service (Empty): Returns honest empty array when 0 results', async () => {
    process.env.TAVILY_API_KEY = 'test_key';
    
    nock('https://api.tavily.com')
      .post('/search')
      .reply(200, {
        query: "nothing found",
        results: []
      });

    const result = await searchPublicDiscussion('NoNameCompany');
    expect(result).toEqual([]);
  });

});
