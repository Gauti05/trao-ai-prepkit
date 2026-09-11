import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();

// Protect all kit routes
router.use(requireAuth);

router.get('/', (req, res) => {
  res.status(200).json({ message: 'List of kits (placeholder)' });
});

export default router;
