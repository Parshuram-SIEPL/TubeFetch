// server/auth.ts
import { Request, Response, NextFunction } from 'express';

// Accept both Authorization: Bearer ... and X-Admin-Token, and sanitize token value
export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  let token = "";

  // Check Authorization header
  if (req.headers.authorization) {
    const split = req.headers.authorization.split(" ");
    if (split.length === 2 && split[0].toLowerCase() === "bearer") {
      token = split[1];
    } else {
      token = req.headers.authorization;
    }
  }

  // If not found, check X-Admin-Token header
  if (!token && typeof req.headers["x-admin-token"] === "string") {
    token = req.headers["x-admin-token"] as string;
  }

  // Sanitize: trim spaces and remove Bearer prefix if present
  token = token.trim();
  if (token.toLowerCase().startsWith("bearer ")) {
    token = token.slice(7).trim();
  }

  // Compare with env ADMIN_TOKEN
  if (token && token === (process.env.ADMIN_TOKEN || "").trim()) {
    next();
  } else {
    res.status(401).json({ success: false, error: "Unauthorized" });
  }
}
