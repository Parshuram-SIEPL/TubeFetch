import type { Express } from "express";
import { createServer, type Server } from "http";
import cors from "cors";
import ytdl from "@distube/ytdl-core";
import { analyzeVideoSchema, type ApiResponse } from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  // Enable CORS for web app integration
  app.use(cors({
    origin: process.env.NODE_ENV === "production" 
      ? process.env.FRONTEND_URL || true
      : true,
    credentials: true
  }));

  // Analyze YouTube video endpoint
  app.post("/api/analyze", async (req, res) => {
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

      res.json(response);

    } catch (error) {
      console.error("Error analyzing video:", error);
      
      let errorMessage = "Failed to analyze video";
      if (error instanceof Error) {
        errorMessage = error.message;
      }

      const response: ApiResponse = {
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
