import request from 'supertest';
import mongoose from 'mongoose';
import app from '../src/index';
import { User } from '../src/models/User';

describe('Auth Endpoints', () => {
  beforeAll(async () => {
    // Wait for mongoose to connect (since it's done asynchronously in index.ts)
    // In a real app we might want a separate db connection for tests, but we'll use the main one here
    // assuming MONGO_URI points to a test DB
  });

  afterAll(async () => {
    await User.deleteMany({});
    await mongoose.connection.close();
  });

  let sessionCookie: string;

  it('should register a new user', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'test@example.com', password: 'password123' });

    expect(res.status).toBe(201);
    expect(res.body.message).toBe('Registered successfully');
  });

  it('should not login with wrong password', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test@example.com', password: 'wrongpassword' });

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Invalid credentials');
  });

  it('should return 401 when accessing protected route without session', async () => {
    const res = await request(app).get('/api/kits');
    expect(res.status).toBe(401);
  });

  it('should return 401 when accessing protected route with tampered session cookie', async () => {
    const res = await request(app)
      .get('/api/kits')
      .set('Cookie', ['connect.sid=s%3Ainvalid_session_id.sig']); // Invalid signature

    expect(res.status).toBe(401);
  });
});
