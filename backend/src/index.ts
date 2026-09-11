import dotenv from 'dotenv';
dotenv.config({ path: '../.env' }); // Assuming .env is at the root level for monorepo

if (!process.env.SESSION_SECRET || !process.env.MONGO_URI) {
  console.error("FATAL ERROR: SESSION_SECRET and MONGO_URI must be set.");
  process.exit(1);
}

import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import session from 'express-session';
import MongoStore from 'connect-mongo';

import authRoutes from './routes/auth.routes';
import kitsRoutes from './routes/kits';

const app = express();
const PORT = process.env.PORT || 5000;

// Trust the Railway proxy so Secure cookies can be set
app.set('trust proxy', 1);

app.use(express.json());

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    clientPromise: mongoose.connection.asPromise().then(() => mongoose.connection.getClient() as any),
  }),
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    maxAge: 1000 * 60 * 60 * 24 // 1 day
  }
}));

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/kits', kitsRoutes);

// Database Connection

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Backend server running on port ${PORT}`);
  });
}

export default app; // For testing
