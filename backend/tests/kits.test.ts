import request from 'supertest';
import app from '../src/index';
import mongoose from 'mongoose';
import { KitModel } from '../src/models/kit.model';
import * as pipelineService from '../src/services/pipeline.service';
import * as generationService from '../src/services/generation.service';

jest.mock('../src/services/pipeline.service');
jest.mock('../src/services/generation.service');

describe('Kits API', () => {
  let sessionCookie: string;
  let otherSessionCookie: string;

  beforeAll(async () => {
    // Register and Login User 1
    await request(app).post('/api/auth/register').send({ email: 'k1@test.com', password: 'pass' });
    const res1 = await request(app).post('/api/auth/login').send({ email: 'k1@test.com', password: 'pass' });
    sessionCookie = res1.headers['set-cookie']?.[0] || '';

    // Register and Login User 2
    await request(app).post('/api/auth/register').send({ email: 'k2@test.com', password: 'pass' });
    const res2 = await request(app).post('/api/auth/login').send({ email: 'k2@test.com', password: 'pass' });
    otherSessionCookie = res2.headers['set-cookie']?.[0] || '';
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    await KitModel.deleteMany({});
    jest.clearAllMocks();
  });

  it('1. Async Creation & Staleness', async () => {
    // Mock the pipeline to NOT resolve immediately (simulate long running)
    let resolvePipeline: any;
    const pipelinePromise = new Promise((res) => { resolvePipeline = res; });
    (pipelineService.runPipeline as jest.Mock).mockReturnValue(pipelinePromise);

    // POST
    const postRes = await request(app)
      .post('/api/kits')
      .set('Cookie', sessionCookie)
      .send({ jd: 'Job', companyUrl: 'http://co.com', days: 7 });

    expect(postRes.status).toBe(201);
    expect(postRes.body.status).toBe('generating');
    const kitId = postRes.body.kitId;

    // Fast-forward staleness: modify updatedAt in DB to be 4 minutes ago bypassing mongoose timestamps
    await mongoose.connection.collection('kits').updateOne({ _id: new mongoose.Types.ObjectId(kitId) }, { $set: { updatedAt: new Date(Date.now() - 4 * 60 * 1000) } });

    // GET should self-heal to failed
    const getRes = await request(app).get(`/api/kits/${kitId}`).set('Cookie', sessionCookie);
    expect(getRes.status).toBe(200);
    expect(getRes.body.status).toBe('failed');
    expect(getRes.body.error).toContain('timed out');
  });

  it('2. Patch Audit Flags', async () => {
    // Create completed kit
    const kit = await KitModel.create({
      userId: (await mongoose.connection.collection('users').findOne({ email: 'k1@test.com' }))?._id,
      jdHash: 'hash',
      jd: 'Job',
      companyUrl: 'http://co.com',
      days: 7,
      status: 'completed',
      data: {
        questions: [
          { id: 'q1', text: 'Old', source: 'ai' }
        ]
      }
    });

    const patchRes = await request(app)
      .patch(`/api/kits/${kit._id}`)
      .set('Cookie', sessionCookie)
      .send({
        questions: [ { id: 'q1', text: 'New text', source: 'edited' } ]
      });

    expect(patchRes.status).toBe(200);

    const updated = await KitModel.findById(kit._id);
    expect(updated?.data.questions[0].source).toBe('edited'); // Assert audit flag was set
  });

  it('3. Regenerate Preservation & Granularity', async () => {
    // Create kit with some edited and some AI questions
    const kit = await KitModel.create({
      userId: (await mongoose.connection.collection('users').findOne({ email: 'k1@test.com' }))?._id,
      jdHash: 'hash2',
      jd: 'Job',
      companyUrl: 'http://co.com',
      days: 7,
      status: 'completed',
      rawContext: { about: [] },
      data: {
        role: { requirements: [] },
        questions: [
          { id: 'q1', category: 'technical', text: 'Tech AI', source: 'ai' },
          { id: 'q2', category: 'technical', text: 'Tech Edited', source: 'edited' },
          { id: 'q3', category: 'behavioural', text: 'Behav AI', source: 'ai' }
        ]
      }
    });

    // Mock generation returning a new technical question
    (generationService.generateQuestionsAndFlashcards as jest.Mock).mockResolvedValue({
      questions: [ { id: 'new_q', category: 'technical', text: 'New Tech AI', source: 'ai' } ],
      flashcards: []
    });

    const regenRes = await request(app)
      .post(`/api/kits/${kit._id}/regenerate-section`)
      .set('Cookie', sessionCookie)
      .send({ section: 'questions', category: 'technical' });

    expect(regenRes.status).toBe(200);

    const updated = await KitModel.findById(kit._id);
    const qs = updated?.data.questions;
    
    // Should have: q2 (edited tech preserved), q3 (behavioural preserved), new_q (new tech)
    // q1 (old AI tech) should be dropped
    expect(qs.length).toBe(3);
    expect(qs.map((q: any) => q.id)).toContain('q2');
    expect(qs.map((q: any) => q.id)).toContain('q3');
    expect(qs.map((q: any) => q.id)).toContain('new_q');
    expect(qs.map((q: any) => q.id)).not.toContain('q1');
  });

  it('4. Regenerate Conflict Guard (409)', async () => {
    const kit = await KitModel.create({
      userId: (await mongoose.connection.collection('users').findOne({ email: 'k1@test.com' }))?._id,
      jdHash: 'hash3',
      jd: 'Job',
      companyUrl: 'http://co.com',
      days: 7,
      status: 'generating'
    });

    const regenRes = await request(app)
      .post(`/api/kits/${kit._id}/regenerate-section`)
      .set('Cookie', sessionCookie)
      .send({ section: 'questions', category: 'technical' });

    expect(regenRes.status).toBe(409);
  });
});
