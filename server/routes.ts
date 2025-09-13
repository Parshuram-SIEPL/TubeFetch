import type { Express } from "express";
import { createServer, type Server } from "http";
import cors from "cors";
import ytdl from "@distube/ytdl-core";
import ytpl from "@distube/ytpl";
import { analyzeVideoSchema, analyzePlaylistSchema, createApiKeySchema, type ApiResponse, type PlaylistApiResponse, type VideoMetadata, type CreateApiKeyRequest, type ApiKeyResponse, apiKeys, apiUsage } from "@shared/schema";
import { authenticateApiKey, optionalAuthentication, authenticateAdmin, generateApiKey, logApiUsage, type AuthenticatedRequest, type AdminAuthenticatedRequest } from "./auth";
import { db } from "./db";
import { eq, desc, count, gte, and } from "drizzle-orm";

export async function registerRoutes(app: Express): Promise<Server> {
  // Enable CORS for web app integration
  app.use(cors({
    origin: process.env.NODE_ENV === "production" 
      ? process.env.FRONTEND_URL 
        ? [process.env.FRONTEND_URL]
        : false // Deny all origins if FRONTEND_URL not set in production
      : true, // Allow all origins in development
    credentials: true
  }));

  // API Key Management Routes

  // Create new API key
  app.post("/api/keys", authenticateAdmin, async (req: AdminAuthenticatedRequest, res) => {
    try {
      const validatedData = createApiKeySchema.parse(req.body);
      const { name, rate_limit_per_hour } = validatedData;

      const { keyId, keySecret, keyHash } = generateApiKey();

      const [newApiKey] = await db.insert(apiKeys).values({
        key_id: keyId,
        key_hash: keyHash,
        name,
        rate_limit_per_hour: rate_limit_per_hour || 100
      }).returning();

      res.status(201).json({
        success: true,
        data: {
          id: newApiKey.id,
          key_id: newApiKey.key_id,
          name: newApiKey.name,
          is_active: newApiKey.is_active,
          rate_limit_per_hour: newApiKey.rate_limit_per_hour,
          created_at: newApiKey.created_at,
          api_key: keySecret // Only returned on creation
        }
      });
    } catch (error) {
      console.error("Error creating API key:", error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Failed to create API key"
      });
    }
  });

  // List API keys (without secrets)
  app.get("/api/keys", authenticateAdmin, async (req: AdminAuthenticatedRequest, res) => {
    try {
      const keys = await db
        .select({
          id: apiKeys.id,
          key_id: apiKeys.key_id,
          name: apiKeys.name,
          is_active: apiKeys.is_active,
          rate_limit_per_hour: apiKeys.rate_limit_per_hour,
          created_at: apiKeys.created_at
        })
        .from(apiKeys)
        .orderBy(desc(apiKeys.created_at));

      // Get usage stats for the last 24 hours for each key
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const keysWithUsage = await Promise.all(
        keys.map(async (key) => {
          const [usage] = await db
            .select({ count: count() })
            .from(apiUsage)
            .where(and(
              eq(apiUsage.api_key_id, key.id),
              gte(apiUsage.request_timestamp, oneDayAgo)
            ));

          return {
            ...key,
            usage_today: usage.count
          };
        })
      );

      res.json({
        success: true,
        data: keysWithUsage
      });
    } catch (error) {
      console.error("Error listing API keys:", error);
      res.status(500).json({
        success: false,
        error: "Failed to list API keys"
      });
    }
  });

  // Delete API key
  app.delete("/api/keys/:keyId", authenticateAdmin, async (req: AdminAuthenticatedRequest, res) => {
    try {
      const { keyId } = req.params;

      const [deletedKey] = await db
        .delete(apiKeys)
        .where(eq(apiKeys.key_id, keyId))
        .returning();

      if (!deletedKey) {
        return res.status(404).json({
          success: false,
          error: "API key not found"
        });
      }

      res.json({
        success: true,
        message: "API key deleted successfully"
      });
    } catch (error) {
      console.error("Error deleting API key:", error);
      res.status(500).json({
        success: false,
        error: "Failed to delete API key"
      });
    }
  });

  // Update API key (activate/deactivate, change rate limit)
  app.patch("/api/keys/:keyId", authenticateAdmin, async (req: AdminAuthenticatedRequest, res) => {
    try {
      const { keyId } = req.params;
      const { is_active, rate_limit_per_hour } = req.body;

      const updateData: any = {};
      if (typeof is_active === "boolean") updateData.is_active = is_active;
      if (typeof rate_limit_per_hour === "number" && rate_limit_per_hour > 0) {
        updateData.rate_limit_per_hour = rate_limit_per_hour;
      }
      updateData.updated_at = new Date();

      const [updatedKey] = await db
        .update(apiKeys)
        .set(updateData)
        .where(eq(apiKeys.key_id, keyId))
        .returning();

      if (!updatedKey) {
        return res.status(404).json({
          success: false,
          error: "API key not found"
        });
      }

      res.json({
        success: true,
        data: {
          id: updatedKey.id,
          key_id: updatedKey.key_id,
          name: updatedKey.name,
          is_active: updatedKey.is_active,
          rate_limit_per_hour: updatedKey.rate_limit_per_hour,
          updated_at: updatedKey.updated_at
        }
      });
    } catch (error) {
      console.error("Error updating API key:", error);
      res.status(500).json({
        success: false,
        error: "Failed to update API key"
      });
    }
  });

  // Analyze YouTube video endpoint
  app.post("/api/analyze", optionalAuthentication, async (req: AuthenticatedRequest, res) => {
    const startTime = Date.now();
    try {
      const validatedData = analyzeVideoSchema.parse(req.body);
      const { url, include_thumbnails } = validatedData;

      // Check if URL is valid YouTube URL
      if (!ytdl.validateURL(url)) {
        const response: ApiResponse = {
          success: false,
          error: "Invalid YouTube URL"
        };
        return res.status(400).json(response);
      }

      // Get video info
      const info = await ytdl.getInfo(url);
      const videoDetails = info.videoDetails;

      // Extract video metadata
      const title = videoDetails.title;
      const description = videoDetails.description || "";
      const author = videoDetails.author.name;
      const views = videoDetails.viewCount ? `${parseInt(videoDetails.viewCount).toLocaleString()} views` : "Unknown views";
      const upload_date = videoDetails.publishDate || "Unknown date";
      const duration = formatDuration(parseInt(videoDetails.lengthSeconds));
      const video_id = videoDetails.videoId;

      // Get thumbnail
      const thumbnail = videoDetails.thumbnails[videoDetails.thumbnails.length - 1]?.url || "";

      // Extract download URLs for different qualities
      const formats = ytdl.filterFormats(info.formats, 'videoandaudio');
      const audioFormats = ytdl.filterFormats(info.formats, 'audioonly');
      
      const download_urls: Record<string, string> = {};

      // Get video qualities
      const qualityMap = new Map();
      formats.forEach(format => {
        if (format.qualityLabel) {
          const quality = format.qualityLabel.toLowerCase();
          if (!qualityMap.has(quality) || (format.container === 'mp4')) {
            qualityMap.set(quality, format.url);
          }
        }
      });

      // Add audio-only format
      if (audioFormats.length > 0) {
        const bestAudio = audioFormats.reduce((prev, curr) => 
          (parseInt(String(curr.audioBitrate || '0')) > parseInt(String(prev.audioBitrate || '0'))) ? curr : prev
        );
        download_urls['audio'] = bestAudio.url;
      }

      // Add video qualities to download_urls
      for (const [quality, url] of Array.from(qualityMap.entries())) {
        download_urls[quality] = url;
      }

      // Extract thumbnails in different sizes
      const thumbnails: Record<string, string> = {};
      if (include_thumbnails) {
        const thumbnailList = videoDetails.thumbnails;
        if (thumbnailList.length > 0) {
          // Get different quality thumbnails
          thumbnails['default'] = `https://img.youtube.com/vi/${video_id}/default.jpg`;
          thumbnails['medium'] = `https://img.youtube.com/vi/${video_id}/mqdefault.jpg`;
          thumbnails['high'] = `https://img.youtube.com/vi/${video_id}/hqdefault.jpg`;
          thumbnails['maxres'] = `https://img.youtube.com/vi/${video_id}/maxresdefault.jpg`;
        }
      }

      const response: ApiResponse = {
        success: true,
        data: {
          title,
          description: description.length > 200 ? description.substring(0, 200) + "..." : description,
          duration,
          author,
          views,
          upload_date,
          thumbnail,
          download_urls,
          thumbnails,
          video_id
        }
      };

      // Log API usage if authenticated
      if (req.apiKey) {
        const processingTime = Date.now() - startTime;
        await logApiUsage(req.apiKey.id, "/api/analyze", 200, processingTime);
      }

      res.json(response);

    } catch (error) {
      console.error("Error analyzing video:", error);
      
      let errorMessage = "Failed to analyze video";
      if (error instanceof Error) {
        errorMessage = error.message;
      }

      // Log API usage for error if authenticated
      if (req.apiKey) {
        const processingTime = Date.now() - startTime;
        await logApiUsage(req.apiKey.id, "/api/analyze", 500, processingTime, errorMessage);
      }

      const response: ApiResponse = {
        success: false,
        error: errorMessage
      };

      res.status(500).json(response);
    }
  });

  // Analyze YouTube playlist endpoint
  app.post("/api/analyze-playlist", optionalAuthentication, async (req: AuthenticatedRequest, res) => {
    const startTime = Date.now();
    try {
      const validatedData = analyzePlaylistSchema.parse(req.body);
      const { url, include_thumbnails, max_videos } = validatedData;

      // Extract playlist ID from URL (handles both playlist URLs and watch URLs with list parameter)
      const playlistIdMatch = url.match(/[?&]list=([^&]+)/);
      if (!playlistIdMatch) {
        const response: PlaylistApiResponse = {
          success: false,
          error: "No playlist parameter found in URL"
        };
        return res.status(400).json(response);
      }

      const playlistId = playlistIdMatch[1];

      // Construct proper playlist URL for ytpl regardless of input format
      const playlistUrl = `https://www.youtube.com/playlist?list=${playlistId}`;

      // Get playlist info using ytpl with the normalized playlist URL
      const playlistInfo = await ytpl(playlistUrl, { limit: max_videos });
      
      // Process videos with limit
      const videoIds = playlistInfo.items.slice(0, max_videos).map((item: any) => item.id);
      const processedVideos: VideoMetadata[] = [];
      const errors: string[] = [];

      // Process each video
      for (const videoId of videoIds) {
        try {
          const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
          const info = await ytdl.getInfo(videoUrl);
          const videoDetails = info.videoDetails;

          // Extract video metadata (reusing logic from single video endpoint)
          const title = videoDetails.title;
          const description = videoDetails.description || "";
          const author = videoDetails.author.name;
          const views = videoDetails.viewCount ? `${parseInt(videoDetails.viewCount).toLocaleString()} views` : "Unknown views";
          const upload_date = videoDetails.publishDate || "Unknown date";
          const duration = formatDuration(parseInt(videoDetails.lengthSeconds));
          const video_id = videoDetails.videoId;
          const thumbnail = videoDetails.thumbnails[videoDetails.thumbnails.length - 1]?.url || "";

          // Extract download URLs
          const formats = ytdl.filterFormats(info.formats, 'videoandaudio');
          const audioFormats = ytdl.filterFormats(info.formats, 'audioonly');
          const download_urls: Record<string, string> = {};

          // Get video qualities
          const qualityMap = new Map();
          formats.forEach(format => {
            if (format.qualityLabel) {
              const quality = format.qualityLabel.toLowerCase();
              if (!qualityMap.has(quality) || (format.container === 'mp4')) {
                qualityMap.set(quality, format.url);
              }
            }
          });

          // Add audio-only format
          if (audioFormats.length > 0) {
            const bestAudio = audioFormats.reduce((prev, curr) => 
              (parseInt(String(curr.audioBitrate || '0')) > parseInt(String(prev.audioBitrate || '0'))) ? curr : prev
            );
            download_urls['audio'] = bestAudio.url;
          }

          // Add video qualities to download_urls
          for (const [quality, url] of Array.from(qualityMap.entries())) {
            download_urls[quality] = url;
          }

          // Extract thumbnails
          const thumbnails: Record<string, string> = {};
          if (include_thumbnails) {
            thumbnails['default'] = `https://img.youtube.com/vi/${video_id}/default.jpg`;
            thumbnails['medium'] = `https://img.youtube.com/vi/${video_id}/mqdefault.jpg`;
            thumbnails['high'] = `https://img.youtube.com/vi/${video_id}/hqdefault.jpg`;
            thumbnails['maxres'] = `https://img.youtube.com/vi/${video_id}/maxresdefault.jpg`;
          }

          processedVideos.push({
            title,
            description: description.length > 200 ? description.substring(0, 200) + "..." : description,
            duration,
            author,
            views,
            upload_date,
            thumbnail,
            download_urls,
            thumbnails,
            video_id
          });

        } catch (error) {
          console.error(`Error processing video ${videoId}:`, error);
          errors.push(`Failed to process video ${videoId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      const response: PlaylistApiResponse = {
        success: true,
        data: {
          title: playlistInfo.title,
          description: playlistInfo.description || "",
          author: (playlistInfo as any).author?.name || "Unknown",
          video_count: (playlistInfo as any).total_items || playlistInfo.items.length,
          thumbnail: (playlistInfo as any).thumbnail?.url || "",
          playlist_id: playlistId,
          videos: processedVideos
        }
      };

      if (errors.length > 0) {
        console.warn("Some videos failed to process:", errors);
      }

      res.json(response);

    } catch (error) {
      console.error("Error analyzing playlist:", error);
      
      let errorMessage = "Failed to analyze playlist";
      if (error instanceof Error) {
        errorMessage = error.message;
      }

      const response: PlaylistApiResponse = {
        success: false,
        error: errorMessage
      };

      res.status(500).json(response);
    }
  });

  // Health check endpoint
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  const httpServer = createServer(app);
  return httpServer;
}

function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  } else {
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }
}
