const axios = require('axios');
const key = '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';
async function run() {
  try {
    const res = await axios.get('https://api.groq.com/openai/v1/models', {
      headers: { 'Authorization': `Bearer ${key}` }
    });
    console.log(res.data.data.map(m => m.id));
  } catch (e) {
    console.error(e.response ? e.response.data : e.message);
  }
}
run();
