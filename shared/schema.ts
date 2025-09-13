import { z } from "zod";
import { pgTable, serial, varchar, text, timestamp, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { relations } from "drizzle-orm";

export const analyzeVideoSchema = z.object({
  url: z.string().url().refine((url) => {
    const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+/;
    return youtubeRegex.test(url);
  }, "Must be a valid YouTube URL"),
  include_thumbnails: z.boolean().optional().default(true),
  quality_filter: z.array(z.string()).optional()
});

export const analyzePlaylistSchema = z.object({
  url: z.string().url().refine((url) => {
    const youtubeRegex = /^(https?:\/\/)?(www\.)?youtube\.com\/.+/;
    const hasPlaylistParam = /[?&]list=([^&]+)/.test(url);
    return youtubeRegex.test(url) && hasPlaylistParam;
  }, "Must be a valid YouTube URL with playlist parameter"),
  include_thumbnails: z.boolean().optional().default(true),
  quality_filter: z.array(z.string()).optional(),
  max_videos: z.number().min(1).max(50).optional().default(10)
});

export const videoMetadataSchema = z.object({
  title: z.string(),
  description: z.string(),
  duration: z.string(),
  author: z.string(),
  views: z.string(),
  upload_date: z.string(),
  thumbnail: z.string().url(),
  download_urls: z.record(z.string().url()),
  thumbnails: z.record(z.string().url()),
  video_id: z.string()
});

export const playlistMetadataSchema = z.object({
  title: z.string(),
  description: z.string(),
  author: z.string(),
  video_count: z.number(),
  thumbnail: z.string().url(),
  playlist_id: z.string(),
  videos: z.array(videoMetadataSchema)
});

export const apiResponseSchema = z.object({
  success: z.boolean(),
  data: videoMetadataSchema.optional(),
  error: z.string().optional()
});

export const playlistApiResponseSchema = z.object({
  success: z.boolean(),
  data: playlistMetadataSchema.optional(),
  error: z.string().optional()
});

// Database Tables
export const apiKeys = pgTable("api_keys", {
  id: serial("id").primaryKey(),
  key_id: varchar("key_id", { length: 32 }).notNull().unique(),
  key_hash: varchar("key_hash", { length: 64 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  is_active: boolean("is_active").notNull().default(true),
  rate_limit_per_hour: integer("rate_limit_per_hour").notNull().default(100),
  created_at: timestamp("created_at").notNull().defaultNow(),
  updated_at: timestamp("updated_at").notNull().defaultNow()
});

export const apiUsage = pgTable("api_usage", {
  id: serial("id").primaryKey(),
  api_key_id: integer("api_key_id").notNull().references(() => apiKeys.id, { onDelete: "cascade" }),
  endpoint: varchar("endpoint", { length: 255 }).notNull(),
  request_timestamp: timestamp("request_timestamp").notNull().defaultNow(),
  response_status: integer("response_status").notNull(),
  processing_time_ms: integer("processing_time_ms"),
  error_message: text("error_message")
});

// Relations
export const apiKeysRelations = relations(apiKeys, ({ many }) => ({
  usage: many(apiUsage)
}));

export const apiUsageRelations = relations(apiUsage, ({ one }) => ({
  apiKey: one(apiKeys, {
    fields: [apiUsage.api_key_id],
    references: [apiKeys.id]
  })
}));

// Zod schemas for API key management
export const createApiKeySchema = z.object({
  name: z.string().min(1).max(255),
  rate_limit_per_hour: z.number().min(1).max(10000).optional().default(100)
});

// Admin authentication schemas
export const adminAuthSchema = z.object({
  token: z.string().min(1, "Admin token is required")
});

export const adminAuthResponseSchema = z.object({
  success: z.boolean(),
  error: z.string().optional()
});

export const apiKeyResponseSchema = z.object({
  id: z.number(),
  key_id: z.string(),
  name: z.string(),
  is_active: z.boolean(),
  rate_limit_per_hour: z.number(),
  created_at: z.date(),
  usage_today: z.number().optional()
});

// Insert schemas
export const insertApiKeySchema = createInsertSchema(apiKeys);
export const insertApiUsageSchema = createInsertSchema(apiUsage);

// Types
export type AnalyzeVideoRequest = z.infer<typeof analyzeVideoSchema>;
export type AnalyzePlaylistRequest = z.infer<typeof analyzePlaylistSchema>;
export type VideoMetadata = z.infer<typeof videoMetadataSchema>;
export type PlaylistMetadata = z.infer<typeof playlistMetadataSchema>;
export type ApiResponse = z.infer<typeof apiResponseSchema>;
export type PlaylistApiResponse = z.infer<typeof playlistApiResponseSchema>;
export type ApiKey = typeof apiKeys.$inferSelect;
export type InsertApiKey = z.infer<typeof insertApiKeySchema>;
export type ApiUsage = typeof apiUsage.$inferSelect;
export type InsertApiUsage = z.infer<typeof insertApiUsageSchema>;
export type CreateApiKeyRequest = z.infer<typeof createApiKeySchema>;
export type ApiKeyResponse = z.infer<typeof apiKeyResponseSchema>;
export type AdminAuthRequest = z.infer<typeof adminAuthSchema>;
export type AdminAuthResponse = z.infer<typeof adminAuthResponseSchema>;
