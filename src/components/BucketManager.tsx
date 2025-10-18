import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Upload, Play, Copy, ExternalLink, Image, Trash2, Download, Settings } from 'lucide-react';
import { toast } from 'sonner';
import { Switch } from './ui/switch';
import { Label } from './ui/label';
import { Slider } from './ui/slider';
import VideoContainer from './VideoContainer';

interface VideoFile {
  key: string;
  url: string;
  size: number;
  lastModified: string;
  thumbnail?: string;
}

interface PlayerSettings {
  width: number;
  height: number;
  autoplay: boolean;
  loop: boolean;
  muted: boolean;
  controls: boolean;
  showTitle: boolean;
  showButtons: boolean;
  buttonStyle: 'default' | 'minimal' | 'modern';
  theme: 'light' | 'dark';
}

export default function BucketManager() {
  const [bucketUrl, setBucketUrl] = useState('https://vid-just.cleverpoly-store.workers.dev');
  const [videos, setVideos] = useState<VideoFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<VideoFile | null>(null);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [uploadingThumbnail, setUploadingThumbnail] = useState(false);
  
  // Player Settings
  const [playerSettings, setPlayerSettings] = useState<PlayerSettings>({
    width: 800,
    height: 450,
    autoplay: false,
    loop: false,
    muted: false,
    controls: true,
    showTitle: true,
    showButtons: true,
    buttonStyle: 'modern',
    theme: 'light'
  });

  // Auto-fetch videos on component load
  useEffect(() => {
    if (bucketUrl) {
      fetchVideos();
    }
  }, [bucketUrl]);

  const fetchVideos = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${bucketUrl}/list-videos?t=${Date.now()}`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      const data = await response.json();
      setVideos(data.videos || []);
    } catch (error) {
      console.error('Failed to fetch videos:', error);
      toast.error('Failed to fetch videos. Check your worker URL.');
      setVideos([]);
    } finally {
      setLoading(false);
    }
  };

  const uploadVideo = async () => {
    if (!uploadFile) return;
    
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', uploadFile);
      
      const response = await fetch(`${bucketUrl}/upload`, {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`);
      }
      
      toast.success('Video uploaded successfully!');
      setUploadFile(null);
      fetchVideos();
    } catch (error) {
      console.error('Upload failed:', error);
      toast.error('Failed to upload video');
    } finally {
      setUploading(false);
    }
  };

  const uploadThumbnail = async (videoKey: string, file: File) => {
    setUploadingThumbnail(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('videoKey', videoKey);
      
      const response = await fetch(`${bucketUrl}/upload-thumbnail`, {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error(`Thumbnail upload failed: ${response.statusText}`);
      }
      
      toast.success('Thumbnail uploaded successfully!');
      fetchVideos();
    } catch (error) {
      console.error('Thumbnail upload failed:', error);
      toast.error('Failed to upload thumbnail');
    } finally {
      setUploadingThumbnail(false);
    }
  };

  const deleteVideo = async (videoKey: string) => {
    if (!confirm('Are you sure you want to delete this video?')) return;
    
    try {
      const response = await fetch(`${bucketUrl}/delete/${videoKey}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error(`Delete failed: ${response.statusText}`);
      }
      
      toast.success('Video deleted successfully!');
      fetchVideos();
    } catch (error) {
      console.error('Delete failed:', error);
      toast.error('Failed to delete video');
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        return true;
      } else {
        // Fallback for older browsers or non-secure contexts
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        textArea.style.opacity = '0';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        
        const successful = document.execCommand('copy');
        textArea.remove();
        
        if (successful) {
          return true;
        } else {
          throw new Error('execCommand failed');
        }
      }
    } catch (error) {
      console.error('Failed to copy:', error);
      throw error;
    }
  };

  const generateCodeSnippet = async () => {
    if (videos.length === 0) {
      toast.error('No videos to generate code for. Please add some videos first.');
      return;
    }

    // Filter out thumbnail files and only include actual videos
    const actualVideos = videos.filter(video => 
      !video.key.startsWith('thumbnails/') && 
      !video.key.match(/\.(jpg|jpeg|png|gif|bmp|webp|svg|ico)$/i)
    );

    if (actualVideos.length === 0) {
      toast.error('No actual video files found');
      return;
    }

    const videoData = actualVideos.map(video => ({
      url: video.url,
      thumbnail: video.thumbnail || '',
      name: video.key
    }));

    //Generate clean embeddable HTML
    const htmlCode = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Video Player</title>
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: transparent;
        }
        .video-player {
            max-width: 800px;
            margin: 0 auto;
            background: #000;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 4px 20px rgba(0,0,0,0.15);
        }
        video {
            width: 100%;
            height: auto;
            display: block;
        }
        .controls {
            background: linear-gradient(to bottom, rgba(0,0,0,0.7), rgba(0,0,0,0.9));
            padding: 16px;
            display: flex;
            align-items: center;
            gap: 12px;
            flex-wrap: wrap;
        }
        .control-btn {
            background: rgba(255,255,255,0.1);
            border: 1px solid rgba(255,255,255,0.2);
            color: white;
            padding: 8px 16px;
            border-radius: 6px;
            cursor: pointer;
            font-size: 14px;
            transition: all 0.2s;
        }
        .control-btn:hover {
            background: rgba(255,255,255,0.2);
        }
        .control-btn:disabled {
            opacity: 0.4;
            cursor: not-allowed;
        }
        .video-list {
            display: flex;
            gap: 8px;
            flex: 1;
            flex-wrap: wrap;
        }
        .video-btn {
            background: #007bff;
            border: none;
            color: white;
            padding: 6px 12px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 13px;
            transition: all 0.2s;
        }
        .video-btn:hover {
            background: #0056b3;
        }
        .video-btn.active {
            background: #28a745;
        }
        .video-info {
            color: rgba(255,255,255,0.9);
            font-size: 13px;
            width: 100%;
            margin-top: 8px;
        }
        @media (max-width: 768px) {
            .controls { padding: 12px; }
            .control-btn { padding: 6px 12px; font-size: 12px; }
            .video-btn { padding: 5px 10px; font-size: 12px; }
        }
    </style>
</head>
<body>
    <div class="video-player">
        <video id="player" controls></video>
        <div class="controls">
            <button class="control-btn" id="prevBtn" onclick="prev()">← Prev</button>
            <button class="control-btn" id="nextBtn" onclick="next()">Next →</button>
            <div class="video-list" id="videoList"></div>
            <div class="video-info" id="info"></div>
        </div>
    </div>
    <script>
        const videos = ${JSON.stringify(videoData, null, 2)};
        let current = 0;
        const player = document.getElementById('player');
        const prevBtn = document.getElementById('prevBtn');
        const nextBtn = document.getElementById('nextBtn');
        const videoList = document.getElementById('videoList');
        const info = document.getElementById('info');
        
        // Create video buttons
        videos.forEach((video, index) => {
            const btn = document.createElement('button');
            btn.className = 'video-btn';
            btn.textContent = index + 1;
            btn.onclick = () => loadVideo(index);
            videoList.appendChild(btn);
        });
        
        function loadVideo(index) {
            current = index;
            player.src = videos[current].url;
            if (videos[current].thumbnail) player.poster = videos[current].thumbnail;
            player.load();
            player.play();
            updateUI();
        }
        
        function updateUI() {
            document.querySelectorAll('.video-btn').forEach((btn, i) => {
                btn.classList.toggle('active', i === current);
            });
            prevBtn.disabled = current === 0;
            nextBtn.disabled = current === videos.length - 1;
            info.textContent = \`\${current + 1} / \${videos.length} - \${videos[current].name}\`;
        }
        
        function prev() { if (current > 0) loadVideo(current - 1); }
        function next() { if (current < videos.length - 1) loadVideo(current + 1); }
        
        // Keyboard navigation
        document.addEventListener('keydown', e => {
            if (e.key === 'ArrowLeft') prev();
            if (e.key === 'ArrowRight') next();
        });
        
        // Auto-play next video
        player.addEventListener('ended', () => { if (current < videos.length - 1) next(); });
        
        // Initialize
        loadVideo(0);
    </script>
</body>
</html>`;

    console.log('Generated HTML code length:', htmlCode.length);
    
    try {
      await copyToClipboard(htmlCode);
      alert('HTML code generated and copied to clipboard!');
      console.log('HTML code copied successfully');
    } catch (error) {
      console.error('Failed to copy:', error);
      alert('Failed to copy HTML code to clipboard');
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/20">
      <div className="max-w-6xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="text-center space-y-4 py-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Video Anywhere Box
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Manage your Cloudflare R2 videos and generate embeddable code with a beautiful video carousel
          </p>
        </div>

      {/* Connection Status */}
      <Card className="border-2 border-primary/20 shadow-lg backdrop-blur-sm bg-card/80">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${
              videos.length > 0 ? 'bg-green-500' : 
              loading ? 'bg-blue-500 animate-pulse' : 
              'bg-gray-400'
            }`}></div>
            Connection Status
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              value={bucketUrl}
              onChange={(e) => setBucketUrl(e.target.value)}
              placeholder="Enter your Cloudflare Worker URL"
              className="flex-1"
            />
            <Button onClick={fetchVideos} disabled={loading}>
              {loading ? 'Loading...' : 'Refresh'}
            </Button>
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">
                {videos.length > 0 ? `${videos.length} videos found` : 
                 loading ? 'Loading...' : 
                 'No videos found'}
              </p>
              <p className="text-sm text-muted-foreground">
                Worker: {bucketUrl}
              </p>
            </div>
            <button 
              onClick={() => {
                console.log('Generate HTML button clicked!');
                generateCodeSnippet();
              }}
              style={{
                backgroundColor: '#16a34a',
                color: 'white',
                padding: '8px 16px',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="7,10 12,15 17,10"/>
                <line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              Generate HTML Code
            </button>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="videos" className="space-y-6">
        <TabsList>
          <TabsTrigger value="videos">Videos ({videos.length})</TabsTrigger>
          <TabsTrigger value="player">Video Player</TabsTrigger>
          <TabsTrigger value="upload">Upload</TabsTrigger>
          <TabsTrigger value="preview">Preview</TabsTrigger>
        </TabsList>

        {/* Videos Tab */}
        <TabsContent value="videos" className="space-y-4">
          {videos.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <p className="text-muted-foreground">No videos found in your bucket</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Upload some videos to get started
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {videos.map((video, index) => (
                <Card key={video.key} className="overflow-hidden">
                  <div className="aspect-video bg-muted relative">
                    {video.thumbnail ? (
                      <img 
                        src={video.thumbnail} 
                        alt={video.key}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Play className="w-12 h-12 text-muted-foreground" />
                      </div>
                    )}
                    <Badge className="absolute top-2 left-2 bg-primary text-primary-foreground">
                      {index + 1}
                    </Badge>
                  </div>
                  
                  <CardContent className="p-4 space-y-3">
                    <div>
                      <h3 className="font-medium truncate" title={video.key}>
                        {video.key}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {formatFileSize(video.size)}
                      </p>
                    </div>
                    
                    <div className="flex gap-2">
                      <button 
                        onClick={() => {
                          console.log('Preview clicked for:', video.key);
                          setSelectedVideo(video);
                        }}
                        style={{
                          backgroundColor: 'transparent',
                          color: 'hsl(var(--foreground))',
                          padding: '6px 12px',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '12px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polygon points="5,3 19,12 5,21"/>
                        </svg>
                        Preview
                      </button>
                      <button 
                        onClick={async () => {
                          try {
                            await copyToClipboard(video.url);
                            alert('Video URL copied to clipboard!');
                          } catch (error) {
                            alert('Failed to copy URL');
                          }
                        }}
                        style={{
                          backgroundColor: 'transparent',
                          color: 'hsl(var(--foreground))',
                          padding: '6px 12px',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '12px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                        </svg>
                        Copy URL
                      </button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => window.open(video.url, '_blank')}
                      >
                        <ExternalLink className="w-4 h-4" />
                      </Button>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Image className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm">
                          {video.thumbnail ? 'Has thumbnail' : 'No thumbnail'}
                        </span>
                      </div>
                      
                      <div className="flex gap-2">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              uploadThumbnail(video.key, file);
                            }
                          }}
                          className="hidden"
                          id={`thumbnail-${video.key}`}
                        />
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => document.getElementById(`thumbnail-${video.key}`)?.click()}
                          disabled={uploadingThumbnail}
                        >
                          <Image className="w-4 h-4 mr-1" />
                          {video.thumbnail ? 'Change' : 'Add'} Thumbnail
                        </Button>
                        <Button 
                          size="sm" 
                          variant="destructive"
                          onClick={() => deleteVideo(video.key)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Video Player Tab */}
        <TabsContent value="player" className="space-y-4">
          {videos.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <p className="text-muted-foreground">No videos available for playback</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Upload some videos to use the video player
                </p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Video Player with Navigation</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Use the arrow buttons to navigate between videos
                </p>
              </CardHeader>
              <CardContent>
                <div>
                  <p className="text-sm text-muted-foreground mb-4">
                    Video URLs: {videos.map(video => video.url).join(', ')}
                  </p>
                  <VideoContainer 
                    urls={videos.map(video => video.url)}
                    title="Video Player"
                    className="max-w-4xl mx-auto"
                  />
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Upload Tab */}
        <TabsContent value="upload" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Upload Video</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <input
                  type="file"
                  accept="video/*"
                  onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                  className="w-full p-2 border rounded"
                />
              </div>
              
              {uploadFile && (
                <div className="p-4 bg-muted rounded-lg">
                  <p className="font-medium text-foreground">{uploadFile.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {formatFileSize(uploadFile.size)} • {uploadFile.type}
                  </p>
                </div>
              )}
              
              <Button 
                onClick={uploadVideo} 
                disabled={!uploadFile || uploading}
                className="w-full"
              >
                <Upload className="w-4 h-4 mr-2" />
                {uploading ? 'Uploading...' : 'Upload Video'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Preview Tab */}
        <TabsContent value="preview" className="space-y-4">
          {selectedVideo ? (
            <Card>
              <CardHeader>
                <CardTitle>Video Preview</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <video 
                  controls 
                  className="w-full rounded-lg"
                  poster={selectedVideo.thumbnail}
                >
                  <source src={selectedVideo.url} type="video/mp4" />
                  <source src={selectedVideo.url} type="video/webm" />
                  <source src={selectedVideo.url} type="video/ogg" />
                  Your browser does not support the video tag.
                </video>
                
                <div className="flex gap-2">
                  <button 
                    onClick={() => window.open(selectedVideo.url, '_blank')}
                    style={{
                      backgroundColor: 'transparent',
                      color: 'hsl(var(--foreground))',
                      padding: '8px 16px',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '14px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                      <polyline points="15,3 21,3 21,9"/>
                      <line x1="10" y1="14" x2="21" y2="3"/>
                    </svg>
                    Open Direct Link
                  </button>
                  <button 
                    onClick={async () => {
                      try {
                        await copyToClipboard(selectedVideo.url);
                        alert('Video URL copied to clipboard!');
                      } catch (error) {
                        alert('Failed to copy URL');
                      }
                    }}
                    style={{
                      backgroundColor: 'transparent',
                      color: 'hsl(var(--foreground))',
                      padding: '8px 16px',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '14px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                    </svg>
                    Copy URL
                  </button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="text-center py-12">
                <p className="text-muted-foreground">Select a video to preview</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Click "Preview" on any video card to see it here
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
      </div>
    </div>
  );
}