// server/auth.ts
import { Request, Response, NextFunction } from 'express';

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.split(' ')[1];
  if (token && token === process.env.ADMIN_TOKEN) {
    next();
  } else {
    res.status(401).json({ success: false, error: 'Unauthorized' });
  }
}
