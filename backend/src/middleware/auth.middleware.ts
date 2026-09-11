import { Request, Response, NextFunction } from 'express';

export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  if (!req.session || !req.session.userId) {
    // If the session is missing or invalid, we clean up the cookie to be safe
    // and return a clear 401 instead of crashing.
    res.clearCookie('connect.sid');
    return res.status(401).json({ error: 'Unauthorized: Session missing or invalid' });
  }
  next();
};
