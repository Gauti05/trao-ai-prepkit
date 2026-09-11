const { MongoClient } = require('mongodb');
const crypto = require('crypto');

async function run() {
  const client = new MongoClient('mongodb://localhost:27017');
  await client.connect();
  const db = client.db('ai-prep-kit');
  
  const kits = await db.collection('kits').find().toArray();
  let updatedCount = 0;

  for (const kit of kits) {
    let modified = false;
    
    if (kit.data && kit.data.questions) {
      for (const q of kit.data.questions) {
        if (q.id === 'q1' || q.id === 'q2' || q.id === 'q3' || q.id === 'q4') {
          q.id = `q_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
          modified = true;
        }
        if (!q.source) {
          q.source = 'ai';
          modified = true;
        }
      }
    }
    
    if (kit.data && kit.data.flashcards) {
      for (const f of kit.data.flashcards) {
        if (f.id === 'f1' || f.id === 'f2' || f.id === 'f3' || f.id === 'f4') {
          f.id = `f_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
          modified = true;
        }
      }
    }
    
    if (modified) {
      await db.collection('kits').updateOne({ _id: kit._id }, { $set: { data: kit.data } });
      updatedCount++;
    }
  }

  console.log(`Fixed duplicate IDs in ${updatedCount} existing kits.`);
  await client.close();
}
run();
