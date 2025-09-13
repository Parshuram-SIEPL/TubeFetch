import { z } from "zod";

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

export type AnalyzeVideoRequest = z.infer<typeof analyzeVideoSchema>;
export type AnalyzePlaylistRequest = z.infer<typeof analyzePlaylistSchema>;
export type VideoMetadata = z.infer<typeof videoMetadataSchema>;
export type PlaylistMetadata = z.infer<typeof playlistMetadataSchema>;
export type ApiResponse = z.infer<typeof apiResponseSchema>;
export type PlaylistApiResponse = z.infer<typeof playlistApiResponseSchema>;
