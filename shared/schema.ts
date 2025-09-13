import { z } from "zod";

export const analyzeVideoSchema = z.object({
  url: z.string().url().refine((url) => {
    const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+/;
    return youtubeRegex.test(url);
  }, "Must be a valid YouTube URL"),
  include_thumbnails: z.boolean().optional().default(true),
  quality_filter: z.array(z.string()).optional()
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

export const apiResponseSchema = z.object({
  success: z.boolean(),
  data: videoMetadataSchema.optional(),
  error: z.string().optional()
});

export type AnalyzeVideoRequest = z.infer<typeof analyzeVideoSchema>;
export type VideoMetadata = z.infer<typeof videoMetadataSchema>;
export type ApiResponse = z.infer<typeof apiResponseSchema>;
