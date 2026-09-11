import { fetchAndClean } from '../src/services/retrieval.service';
import nock from 'nock';
import dns from 'dns';

describe('Retrieval Service - fetchAndClean', () => {
  beforeEach(() => {
    nock.cleanAll();
    jest.restoreAllMocks();
    process.env.ALLOW_PRIVATE_IPS = 'false';
  });

  afterAll(() => {
    nock.restore();
  });

  it('1. Success: Returns cleaned text and extracted links', async () => {
    jest.spyOn(dns.promises, 'lookup').mockResolvedValue([{ address: '93.184.216.34', family: 4 }] as any);

    nock('https://example.com')
      .get('/robots.txt')
      .reply(404);

    nock('https://example.com')
      .get('/page')
      .reply(200, `
        <html>
          <body>
            <nav><a href="/ignore">Nav Link</a></nav>
            <main>
              <h1>Hello World</h1>
              <p>This is test content.</p>
              <a href="/about">About Us</a>
              <a href="https://external.com">External</a>
            </main>
            <footer>Ignore footer</footer>
            <script>console.log("ignore script");</script>
          </body>
        </html>
      `, { 'content-type': 'text/html; charset=utf-8' });

    const result = await fetchAndClean('https://example.com/page');
    
    expect(result.ok).toBe(true);
    expect(result.text).toContain('Hello World This is test content.');
    expect(result.text).not.toContain('Nav Link');
    expect(result.text).not.toContain('Ignore footer');
    expect(result.text).not.toContain('ignore script');
    
    expect(result.links).toEqual(expect.arrayContaining([
      'https://example.com/about',
      'https://external.com/'
    ]));
  });

  it('2. Missing robots.txt (404) allows crawling', async () => {
    jest.spyOn(dns.promises, 'lookup').mockResolvedValue([{ address: '93.184.216.34', family: 4 }] as any);

    nock('https://example.com')
      .get('/robots.txt')
      .reply(404); // Explicit 404

    nock('https://example.com')
      .get('/page')
      .reply(200, '<html><body>OK</body></html>', { 'content-type': 'text/html' });

    const result = await fetchAndClean('https://example.com/page');
    expect(result.ok).toBe(true);
    expect(result.text).toBe('OK');
  });

  it('3. 404 Page returns NOT_FOUND', async () => {
    jest.spyOn(dns.promises, 'lookup').mockResolvedValue([{ address: '93.184.216.34', family: 4 }] as any);

    nock('https://example.com')
      .get('/robots.txt')
      .reply(404);

    nock('https://example.com')
      .get('/404')
      .reply(404);

    const result = await fetchAndClean('https://example.com/404');
    expect(result.ok).toBe(false);
    expect(result.code).toBe('NOT_FOUND');
  });

  it('4. Timeout returns TIMEOUT', async () => {
    jest.spyOn(dns.promises, 'lookup').mockResolvedValue([{ address: '93.184.216.34', family: 4 }] as any);

    nock('https://example.com')
      .get('/robots.txt')
      .reply(404);

    nock('https://example.com')
      .get('/timeout')
      .delayConnection(6000)
      .reply(200, '<html><body>Late</body></html>');

    const result = await fetchAndClean('https://example.com/timeout');
    expect(result.ok).toBe(false);
    expect(result.code).toBe('TIMEOUT');
  }, 10000);

  it('5. Robots.txt Disallow returns ROBOTS_DISALLOWED', async () => {
    jest.spyOn(dns.promises, 'lookup').mockResolvedValue([{ address: '93.184.216.34', family: 4 }] as any);

    nock('https://example.com')
      .get('/robots.txt')
      .reply(200, `User-agent: *\nDisallow: /blocked`);

    const result = await fetchAndClean('https://example.com/blocked');
    expect(result.ok).toBe(false);
    expect(result.code).toBe('ROBOTS_DISALLOWED');
  });

  it('6. Oversized Response returns TOO_LARGE', async () => {
    jest.spyOn(dns.promises, 'lookup').mockResolvedValue([{ address: '93.184.216.34', family: 4 }] as any);

    nock('https://example.com')
      .get('/robots.txt')
      .reply(404);

    nock('https://example.com')
      .get('/large')
      .reply(200, '<html><body>OK</body></html>', { 
        'content-type': 'text/html',
        'content-length': '10000000' // 10MB
      });

    const result = await fetchAndClean('https://example.com/large');
    expect(result.ok).toBe(false);
    expect(result.code).toBe('TOO_LARGE');
  });

  it('7. SSRF Redirect Block (Public URL redirects to 169.254.169.254)', async () => {
    jest.spyOn(dns.promises, 'lookup')
      .mockResolvedValueOnce([{ address: '93.184.216.34', family: 4 }] as any) // Initial public IP
      .mockResolvedValueOnce([{ address: '169.254.169.254', family: 4 }] as any); // Redirects to metadata IP

    nock('https://public.com')
      .get('/robots.txt')
      .reply(404);

    nock('https://public.com')
      .get('/redirect')
      .reply(302, '', { location: 'http://internal.metadata/' });

    const result = await fetchAndClean('https://public.com/redirect');
    expect(result.ok).toBe(false);
    expect(result.code).toBe('PRIVATE_IP_BLOCKED');
  });

  it('8. DNS Rebinding (evil.example.com resolves to 127.0.0.1)', async () => {
    // DNS resolution returns private IP immediately
    jest.spyOn(dns.promises, 'lookup').mockResolvedValue([{ address: '127.0.0.1', family: 4 }] as any);

    const result = await fetchAndClean('https://evil.example.com/page');
    expect(result.ok).toBe(false);
    expect(result.code).toBe('PRIVATE_IP_BLOCKED');
  });

  it('9. IPv6 Loopback Block ([::1])', async () => {
    // DNS resolution returns IPv6 loopback
    jest.spyOn(dns.promises, 'lookup').mockResolvedValue([{ address: '::1', family: 6 }] as any);

    const result = await fetchAndClean('https://ipv6.example.com/page');
    expect(result.ok).toBe(false);
    expect(result.code).toBe('PRIVATE_IP_BLOCKED');
  });

});
