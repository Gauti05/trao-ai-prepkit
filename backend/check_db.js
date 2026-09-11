const { MongoClient } = require('mongodb');
async function run() {
  const client = new MongoClient('mongodb://localhost:27017');
  await client.connect();
  const db = client.db('ai-prep-kit');
  const kits = await db.collection('kits').find().sort({ createdAt: -1 }).limit(1).toArray();
  if (kits.length) {
    console.log("Questions:");
    console.log(JSON.stringify(kits[0].data?.questions?.map(q => ({id: q.id, source: q.source, category: q.category})), null, 2));
  } else {
    console.log("No kits");
  }
  await client.close();
}
run();
