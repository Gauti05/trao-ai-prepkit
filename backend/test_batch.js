const http = require('http');
const fs = require('fs');
const { spawn } = require('child_process');

const server = http.createServer((req, res) => {
  if (req.url === '/') {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end('<html><body><h1>Mock Company</h1><a href="/careers">Careers</a><a href="/about">About Us</a></body></html>');
  } else if (req.url === '/careers') {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end('<html><body><h1>We are hiring engineers!</h1></body></html>');
  } else if (req.url === '/about') {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end('<html><body><h1>About us</h1><p>We are a cool company.</p></body></html>');
  } else if (req.url === '/no-careers') {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end('<html><body><h1>Just a boring company</h1><p>No jobs here.</p></body></html>');
  } else {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
  }
});

server.listen(0, () => {
  const port = server.address().port;
  console.log(`Mock server listening on port ${port}`);

  const cases = [
    {
      id: "case_1_normal",
      jd: "We are looking for a software engineer who knows React and Node.js. 3 years experience required.",
      company_url: `http://localhost:${port}/`,
      days: 3
    },
    {
      id: "case_2_no_careers",
      jd: "Looking for a backend engineer. Python and SQL.",
      company_url: `http://localhost:${port}/no-careers`,
      days: 3
    },
    {
      id: "case_3_deliberate_404",
      jd: " ",
      company_url: `http://localhost:${port}/does-not-exist`,
      days: 3
    }
  ];

  fs.writeFileSync('cases.json', JSON.stringify(cases, null, 2));

  // We explicitly run the evaluate script with ALLOW_PRIVATE_IPS=true for our test fixture
  // Load root .env manually for the test fixture if it exists
  let rootEnv = {};
  try {
    const rootEnvContent = fs.readFileSync('../.env', 'utf8');
    rootEnvContent.split('\n').forEach(line => {
      const match = line.match(/^([^=]+)=(.*)$/);
      if (match) rootEnv[match[1].trim()] = match[2].trim();
    });
  } catch (e) {}

  const env = { ...process.env, ...rootEnv, ALLOW_PRIVATE_IPS: 'true' };

  console.log('Running npm run evaluate...');
  const child = spawn('npm', ['run', 'evaluate', '--', '--input', 'cases.json', '--output', 'kits.json'], {
    env,
    stdio: 'inherit',
    shell: true
  });

  child.on('close', (code) => {
    console.log(`Evaluate exited with code ${code}`);
    server.close();
    
    if (code !== 0) {
      console.error('Test failed: npm run evaluate exited with non-zero code.');
      process.exit(1);
    }

    const output = JSON.parse(fs.readFileSync('kits.json', 'utf8'));
    
    let allGood = true;
    
    if (output.version !== "1.0") {
      console.error("Test failed: output version mismatch");
      allGood = false;
    }
    
    const case3 = output.kits.find(k => k.id === 'case_3_deliberate_404');
    if (!case3 || case3.status !== 'failed' || !case3.error || !case3.error.code) {
      console.error("Test failed: case 3 should have failed gracefully but didn't.", case3);
      allGood = false;
    } else {
      console.log("Success: Case 3 correctly reported failure.");
    }

    const case1 = output.kits.find(k => k.id === 'case_1_normal');
    if (!case1 || case1.status !== 'ok' || !case1.kit) {
      console.error("Test failed: case 1 should be ok.", case1);
      allGood = false;
    } else {
      console.log("Success: Case 1 correctly succeeded.");
    }

    if (allGood) {
      console.log('All end-to-end tests passed!');
    } else {
      process.exit(1);
    }
  });
});
