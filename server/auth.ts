import { Request, Response, NextFunction } from "express";
import { randomBytes, createHash, timingSafeEqual } from "crypto";
import { db } from "./db";
import { apiKeys, apiUsage } from "@shared/schema";
import { eq, and, gte, count } from "drizzle-orm";

export interface AuthenticatedRequest extends Request {
  apiKey?: {
    id: number;
    key_id: string;
    name: string;
    rate_limit_per_hour: number;
  };
}

export interface AdminAuthenticatedRequest extends Request {
  isAdmin?: boolean;
}

// Generate a new API key
export function generateApiKey(): { keyId: string; keySecret: string; keyHash: string } {
  const keyId = randomBytes(16).toString("hex");
  const keySecret = randomBytes(32).toString("hex");
  const keyHash = createHash("sha256").update(keySecret).digest("hex");
  
  return {
    keyId,
    keySecret: `yt_${keyId}_${keySecret}`,
    keyHash
  };
}

// Parse and validate API key format
function parseApiKey(apiKey: string): { keyId: string; keySecret: string } | null {
  if (!apiKey.startsWith("yt_")) {
    return null;
  }
  
  const parts = apiKey.split("_");
  if (parts.length !== 3) {
    return null;
  }
  
  return {
    keyId: parts[1],
    keySecret: parts[2]
  };
}

// Verify API key against database
async function verifyApiKey(keyId: string, keySecret: string): Promise<any | null> {
  try {
    const [apiKey] = await db
      .select()
      .from(apiKeys)
      .where(and(eq(apiKeys.key_id, keyId), eq(apiKeys.is_active, true)));
    
    if (!apiKey) {
      return null;
    }
    
    const providedHash = createHash("sha256").update(keySecret).digest("hex");
    const storedHashBuffer = Buffer.from(apiKey.key_hash, "hex");
    const providedHashBuffer = Buffer.from(providedHash, "hex");
    
    if (!timingSafeEqual(storedHashBuffer, providedHashBuffer)) {
      return null;
    }
    
    return apiKey;
  } catch (error) {
    console.error("Error verifying API key:", error);
    return null;
  }
}

// Check rate limit for API key
async function checkRateLimit(apiKeyId: number, rateLimit: number): Promise<boolean> {
  try {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    
    const [result] = await db
      .select({ count: count() })
      .from(apiUsage)
      .where(and(
        eq(apiUsage.api_key_id, apiKeyId),
        gte(apiUsage.request_timestamp, oneHourAgo)
      ));
    
    return result.count < rateLimit;
  } catch (error) {
    console.error("Error checking rate limit:", error);
    return false;
  }
}

// Log API usage
export async function logApiUsage(
  apiKeyId: number,
  endpoint: string,
  responseStatus: number,
  processingTimeMs?: number,
  errorMessage?: string
): Promise<void> {
  try {
    await db.insert(apiUsage).values({
      api_key_id: apiKeyId,
      endpoint,
      response_status: responseStatus,
      processing_time_ms: processingTimeMs,
      error_message: errorMessage
    });
  } catch (error) {
    console.error("Error logging API usage:", error);
  }
}

// Authentication middleware
export async function authenticateApiKey(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const apiKey = req.headers["x-api-key"] as string;
  
  if (!apiKey) {
    res.status(401).json({
      success: false,
      error: "API key required. Include 'X-API-Key' header with your request."
    });
    return;
  }
  
  const parsed = parseApiKey(apiKey);
  if (!parsed) {
    res.status(401).json({
      success: false,
      error: "Invalid API key format"
    });
    return;
  }
  
  const verifiedKey = await verifyApiKey(parsed.keyId, parsed.keySecret);
  if (!verifiedKey) {
    res.status(401).json({
      success: false,
      error: "Invalid or inactive API key"
    });
    return;
  }
  
  const hasCapacity = await checkRateLimit(verifiedKey.id, verifiedKey.rate_limit_per_hour);
  if (!hasCapacity) {
    res.status(429).json({
      success: false,
      error: `Rate limit exceeded. Maximum ${verifiedKey.rate_limit_per_hour} requests per hour.`
    });
    return;
  }
  
  req.apiKey = {
    id: verifiedKey.id,
    key_id: verifiedKey.key_id,
    name: verifiedKey.name,
    rate_limit_per_hour: verifiedKey.rate_limit_per_hour
  };
  
  next();
}

// Optional authentication middleware (allows both authenticated and public access)
export async function optionalAuthentication(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const apiKey = req.headers["x-api-key"] as string;
  
  if (!apiKey) {
    // No API key provided, continue with public access
    next();
    return;
  }
  
  const parsed = parseApiKey(apiKey);
  if (!parsed) {
    // Invalid format but continue with public access
    next();
    return;
  }
  
  const verifiedKey = await verifyApiKey(parsed.keyId, parsed.keySecret);
  if (!verifiedKey) {
    // Invalid key but continue with public access
    next();
    return;
  }
  
  const hasCapacity = await checkRateLimit(verifiedKey.id, verifiedKey.rate_limit_per_hour);
  if (!hasCapacity) {
    res.status(429).json({
      success: false,
      error: `Rate limit exceeded. Maximum ${verifiedKey.rate_limit_per_hour} requests per hour.`
    });
    return;
  }
  
  req.apiKey = {
    id: verifiedKey.id,
    key_id: verifiedKey.key_id,
    name: verifiedKey.name,
    rate_limit_per_hour: verifiedKey.rate_limit_per_hour
  };
  
  next();
}

// Admin authentication middleware
export async function authenticateAdmin(
  req: AdminAuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const adminToken = req.headers["x-admin-token"] as string;
  const requiredAdminToken = process.env.ADMIN_TOKEN;

  if (!requiredAdminToken) {
    console.error("ADMIN_TOKEN environment variable is not configured");
    res.status(500).json({
      success: false,
      error: "Admin authentication is not properly configured"
    });
    return;
  }
  
  if (!adminToken) {
    res.status(401).json({
      success: false,
      error: "Admin token required. Include 'X-Admin-Token' header with your request."
    });
    return;
  }
  
  if (adminToken !== requiredAdminToken) {
    res.status(403).json({
      success: false,
      error: "Invalid admin token"
    });
    return;
  }
  
  req.isAdmin = true;
  next();
}