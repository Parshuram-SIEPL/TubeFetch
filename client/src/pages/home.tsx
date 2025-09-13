import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { useTheme } from "@/components/theme-provider";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { AnalyzeVideoRequest, ApiResponse } from "@shared/schema";
import { Moon, Sun, Search, Download, Video, Music, Image, Loader2, AlertTriangle, Code, Book, Play, Bolt, Shield, ExternalLink } from "lucide-react";

export default function Home() {
  const [url, setUrl] = useState("");
  const [videoData, setVideoData] = useState<ApiResponse["data"] | null>(null);
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();

  const analyzeVideoMutation = useMutation({
    mutationFn: async (data: AnalyzeVideoRequest): Promise<ApiResponse> => {
      const response = await apiRequest("POST", "/api/analyze", data);
      return response.json();
    },
    onSuccess: (data) => {
      if (data.success && data.data) {
        setVideoData(data.data);
        toast({
          title: "Success",
          description: "Video analyzed successfully",
        });
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to analyze video",
          variant: "destructive",
        });
      }
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to analyze video",
        variant: "destructive",
      });
    },
  });

  const handleAnalyze = () => {
    if (!url.trim()) {
      toast({
        title: "Error",
        description: "Please enter a YouTube URL",
        variant: "destructive",
      });
      return;
    }

    const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+/;
    if (!youtubeRegex.test(url)) {
      toast({
        title: "Error",
        description: "Please enter a valid YouTube URL",
        variant: "destructive",
      });
      return;
    }

    analyzeVideoMutation.mutate({
      url: url.trim(),
      include_thumbnails: true,
    });
  };

  const handleSampleUrl = () => {
    setUrl("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
  };

  const handleDownload = (downloadUrl: string, quality: string) => {
    window.open(downloadUrl, '_blank');
    toast({
      title: "Download Started",
      description: `Downloading ${quality} quality`,
    });
  };

  const formatFileSize = (quality: string): string => {
    const sizes: Record<string, string> = {
      '1080p': '245.7 MB',
      '720p': '142.3 MB',
      '480p': '89.1 MB',
      '360p': '54.2 MB',
      'audio': '14.2 MB'
    };
    return sizes[quality] || 'Unknown size';
  };

  const getVideoIcon = (quality: string) => {
    return quality === 'audio' ? <Music className="w-5 h-5" /> : <Video className="w-5 h-5" />;
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <div className="bg-youtube text-white p-2 rounded-lg">
                <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                </svg>
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">YT Downloader API</h1>
                <p className="text-xs text-muted-foreground">Fast & Reliable Video Downloads</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(theme === "light" ? "dark" : "light")}
              data-testid="button-theme-toggle"
            >
              {theme === "light" ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* URL Input Section */}
        <section className="mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="mb-6">
                <h2 className="text-2xl font-semibold text-foreground mb-2">Download YouTube Videos</h2>
                <p className="text-muted-foreground">Enter a YouTube URL to extract video information and download links</p>
              </div>
              
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="flex-1">
                    <Input
                      type="url"
                      placeholder="https://www.youtube.com/watch?v=..."
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleAnalyze()}
                      className="w-full"
                      data-testid="input-youtube-url"
                    />
                  </div>
                  <Button
                    onClick={handleAnalyze}
                    disabled={analyzeVideoMutation.isPending}
                    className="min-w-[120px]"
                    data-testid="button-analyze"
                  >
                    {analyzeVideoMutation.isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Search className="mr-2 h-4 w-4" />
                    )}
                    {analyzeVideoMutation.isPending ? "Analyzing..." : "Analyze"}
                  </Button>
                </div>
                
                <div className="flex flex-wrap gap-2">
                  <span className="text-sm text-muted-foreground">Try:</span>
                  <button 
                    onClick={handleSampleUrl}
                    className="text-sm text-youtube hover:underline"
                    data-testid="button-sample-url"
                  >
                    Sample Video URL
                  </button>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Loading State */}
        {analyzeVideoMutation.isPending && (
          <section className="mb-8 fade-in">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-center space-x-3">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  <span className="text-muted-foreground">Analyzing video...</span>
                </div>
              </CardContent>
            </Card>
          </section>
        )}

        {/* Video Metadata */}
        {videoData && (
          <>
            <section className="mb-8 fade-in">
              <Card className="overflow-hidden">
                <div className="aspect-video bg-muted relative">
                  <img 
                    src={videoData.thumbnail}
                    alt="Video thumbnail" 
                    className="w-full h-full object-cover"
                    data-testid="img-video-thumbnail"
                  />
                  <div className="absolute bottom-2 right-2 bg-black bg-opacity-75 text-white px-2 py-1 rounded text-sm">
                    <span data-testid="text-video-duration">{videoData.duration}</span>
                  </div>
                </div>
                
                <CardContent className="p-6">
                  <h3 className="text-xl font-semibold text-foreground mb-2" data-testid="text-video-title">
                    {videoData.title}
                  </h3>
                  <div className="flex items-center space-x-4 text-sm text-muted-foreground mb-4">
                    <span data-testid="text-video-author">{videoData.author}</span>
                    <span data-testid="text-video-views">{videoData.views}</span>
                    <span data-testid="text-video-upload-date">{videoData.upload_date}</span>
                  </div>
                  <p className="text-muted-foreground text-sm line-clamp-3" data-testid="text-video-description">
                    {videoData.description}
                  </p>
                </CardContent>
              </Card>
            </section>

            {/* Download Options */}
            <section className="mb-8 fade-in">
              <Card>
                <CardContent className="p-6">
                  <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center">
                    <Download className="mr-2 text-primary" />
                    Download Options
                  </h3>
                  
                  <div className="space-y-3">
                    {Object.entries(videoData.download_urls).map(([quality, downloadUrl]) => (
                      <div key={quality} className="flex items-center justify-between p-4 bg-secondary rounded-lg hover:bg-accent transition-colors">
                        <div className="flex items-center space-x-3">
                          {getVideoIcon(quality)}
                          <div>
                            <div className="font-medium text-foreground" data-testid={`text-quality-${quality}`}>
                              {quality === 'audio' ? 'Audio Only (MP3)' : `${quality} MP4`}
                            </div>
                            <div className="text-sm text-muted-foreground" data-testid={`text-size-${quality}`}>
                              {formatFileSize(quality)}
                            </div>
                          </div>
                        </div>
                        <Button
                          onClick={() => handleDownload(downloadUrl, quality)}
                          data-testid={`button-download-${quality}`}
                        >
                          <Download className="mr-2 h-4 w-4" />
                          Download
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </section>

            {/* Thumbnail Options */}
            <section className="mb-8 fade-in">
              <Card>
                <CardContent className="p-6">
                  <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center">
                    <Image className="mr-2 text-primary" />
                    Thumbnail Downloads
                  </h3>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {Object.entries(videoData.thumbnails).map(([size, thumbnailUrl]) => (
                      <div key={size} className="bg-secondary rounded-lg p-4 hover:bg-accent transition-colors">
                        <div className="aspect-video bg-muted rounded mb-3 overflow-hidden">
                          <img 
                            src={thumbnailUrl}
                            alt="Thumbnail preview" 
                            className="w-full h-full object-cover"
                            data-testid={`img-thumbnail-${size}`}
                          />
                        </div>
                        <div className="text-center">
                          <div className="font-medium text-foreground text-sm" data-testid={`text-thumbnail-resolution-${size}`}>
                            {size.charAt(0).toUpperCase() + size.slice(1)} Quality
                          </div>
                          <div className="text-xs text-muted-foreground mb-2">
                            Thumbnail
                          </div>
                          <Button
                            size="sm"
                            className="w-full"
                            onClick={() => handleDownload(thumbnailUrl, `thumbnail-${size}`)}
                            data-testid={`button-download-thumbnail-${size}`}
                          >
                            <Download className="mr-1 h-3 w-3" />
                            Download
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </section>
          </>
        )}

        {/* API Documentation */}
        <section className="mb-8">
          <Card>
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center">
                <Code className="mr-2 text-primary" />
                API Documentation
              </h3>
              
              <div className="space-y-6">
                <div>
                  <h4 className="font-medium text-foreground mb-2">POST /api/analyze</h4>
                  <div className="bg-muted rounded-lg p-4 overflow-x-auto">
                    <pre className="text-sm text-muted-foreground"><code>{`{
  "url": "https://www.youtube.com/watch?v=VIDEO_ID",
  "include_thumbnails": true,
  "quality_filter": ["1080p", "720p", "480p", "audio"]
}`}</code></pre>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-medium text-foreground mb-2">Response Format</h4>
                  <div className="bg-muted rounded-lg p-4 overflow-x-auto">
                    <pre className="text-sm text-muted-foreground"><code>{`{
  "success": true,
  "data": {
    "title": "Video Title",
    "description": "Video description...",
    "duration": "10:24",
    "author": "Channel Name",
    "views": "1.2M",
    "upload_date": "2023-12-01",
    "thumbnail": "https://...",
    "download_urls": {
      "1080p": "https://...",
      "720p": "https://...",
      "480p": "https://...",
      "audio": "https://..."
    },
    "thumbnails": {
      "high": "https://...",
      "medium": "https://...",
      "default": "https://..."
    }
  }
}`}</code></pre>
                  </div>
                </div>
                
                <div className="flex items-center space-x-4">
                  <Button variant="secondary" data-testid="button-full-docs">
                    <Book className="mr-2 h-4 w-4" />
                    Full Documentation
                  </Button>
                  <Button variant="secondary" data-testid="button-test-api">
                    <Play className="mr-2 h-4 w-4" />
                    Test API
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Features */}
        <section className="mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card className="text-center">
              <CardContent className="p-6">
                <div className="bg-primary/10 text-primary p-3 rounded-lg w-12 h-12 flex items-center justify-center mx-auto mb-4">
                  <Bolt className="w-6 h-6" />
                </div>
                <h3 className="font-semibold text-foreground mb-2">Fast Processing</h3>
                <p className="text-muted-foreground text-sm">Lightning-fast video analysis and metadata extraction</p>
              </CardContent>
            </Card>
            
            <Card className="text-center">
              <CardContent className="p-6">
                <div className="bg-primary/10 text-primary p-3 rounded-lg w-12 h-12 flex items-center justify-center mx-auto mb-4">
                  <Video className="w-6 h-6" />
                </div>
                <h3 className="font-semibold text-foreground mb-2">Multiple Qualities</h3>
                <p className="text-muted-foreground text-sm">Support for all available video qualities and audio-only</p>
              </CardContent>
            </Card>
            
            <Card className="text-center">
              <CardContent className="p-6">
                <div className="bg-primary/10 text-primary p-3 rounded-lg w-12 h-12 flex items-center justify-center mx-auto mb-4">
                  <Shield className="w-6 h-6" />
                </div>
                <h3 className="font-semibold text-foreground mb-2">Secure & Reliable</h3>
                <p className="text-muted-foreground text-sm">Safe downloads with proper error handling and validation</p>
              </CardContent>
            </Card>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-card border-t border-border mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="text-center text-muted-foreground text-sm">
            <p>&copy; 2024 YouTube Downloader API. Built with ❤️ for developers.</p>
            <div className="mt-2 space-x-4">
              <a href="#" className="hover:text-foreground transition-colors">Privacy</a>
              <a href="#" className="hover:text-foreground transition-colors">Terms</a>
              <a href="#" className="hover:text-foreground transition-colors">Support</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
