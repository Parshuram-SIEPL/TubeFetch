// server/auth.ts
import { Request, Response, NextFunction } from 'express';

// Accept both Authorization: Bearer ... and X-Admin-Token
export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  let token = '';
  // Support Authorization: Bearer ...
  if (req.headers.authorization) {
    const split = req.headers.authorization.split(' ');
    if (split.length === 2 && split[0].toLowerCase() === 'bearer') {
      token = split[1];
    }
  }
  // Support X-Admin-Token header
  if (!token && typeof req.headers['x-admin-token'] === 'string') {
    token = req.headers['x-admin-token'] as string;
  }
  if (token && token === process.env.ADMIN_TOKEN) {
    next();
  } else {
    res.status(401).json({ success: false, error: 'Unauthorized' });
  }
}
