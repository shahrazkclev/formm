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
      toast.error('No videos to generate code for');
      return;
    }
    
    console.log('Generating code snippet for', videos.length, 'videos');
    toast.loading('Generating HTML code...', { id: 'generating' });

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

    // Generate dynamic buttons based on actual video count
    const buttonsHtml = videoData.map((video, index) => 
      `<button class="btn" onclick="playVideo(${index})" title="${video.name}">Video ${index + 1}</button>`
    ).join('\n            ');

    const htmlCode = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Video Player - ${actualVideos.length} Videos</title>
    <style>
        * { box-sizing: border-box; }
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
            margin: 0; 
            padding: 20px; 
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
        }
        .container { 
            max-width: 900px; 
            margin: 0 auto; 
        }
        .video-container { 
            background: white; 
            border-radius: 12px; 
            overflow: hidden; 
            box-shadow: 0 10px 30px rgba(0,0,0,0.2);
            margin-bottom: 20px;
        }
        video { 
            width: 100%; 
            height: auto; 
            display: block; 
            background: #000;
        }
        .video-info { 
            padding: 15px 20px; 
            background: #f8f9fa; 
            border-bottom: 1px solid #e9ecef;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .video-title {
            font-weight: 600;
            color: #333;
            margin: 0;
        }
        .video-counter {
            background: #007bff;
            color: white;
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 500;
        }
        .controls { 
            padding: 20px; 
            background: #fff;
        }
        .btn { 
            padding: 10px 20px; 
            margin: 5px; 
            border: none; 
            border-radius: 6px; 
            cursor: pointer; 
            background: #007bff; 
            color: white; 
            font-weight: 500;
            transition: all 0.3s ease;
            font-size: 14px;
        }
        .btn:hover { 
            background: #0056b3; 
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(0,123,255,0.3);
        }
        .btn.active { 
            background: #28a745; 
            box-shadow: 0 4px 12px rgba(40,167,69,0.3);
        }
        .navigation {
            display: flex;
            justify-content: center;
            gap: 10px;
            margin-top: 15px;
        }
        .nav-btn {
            padding: 12px 24px;
            background: #6c757d;
            color: white;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-weight: 500;
            transition: all 0.3s ease;
        }
        .nav-btn:hover:not(:disabled) {
            background: #5a6268;
            transform: translateY(-2px);
        }
        .nav-btn:disabled {
            background: #e9ecef;
            color: #6c757d;
            cursor: not-allowed;
        }
        .error-message {
            background: #f8d7da;
            color: #721c24;
            padding: 15px;
            border-radius: 6px;
            margin: 10px 0;
            border: 1px solid #f5c6cb;
        }
        @media (max-width: 768px) {
            body { padding: 10px; }
            .btn { padding: 8px 16px; font-size: 13px; }
            .nav-btn { padding: 10px 20px; }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="video-container">
            <video id="videoPlayer" controls poster="${videoData[0]?.thumbnail || ''}">
                <source src="${videoData[0]?.url || ''}" type="video/mp4">
                Your browser does not support the video tag.
            </video>
            <div class="video-info">
                <h3 class="video-title" id="videoTitle">${videoData[0]?.name || 'Video 1'}</h3>
                <span class="video-counter" id="videoCounter">1 / ${videoData.length}</span>
            </div>
            <div class="controls">
                <div class="navigation">
                    <button class="nav-btn" id="prevBtn" onclick="previousVideo()">← Previous</button>
                    <button class="nav-btn" id="nextBtn" onclick="nextVideo()">Next →</button>
                </div>
                <div style="margin-top: 15px; text-align: center;">
                    ${buttonsHtml}
                </div>
            </div>
        </div>
    </div>

    <script>
        const videoData = ${JSON.stringify(videoData, null, 2)};
        let currentVideoIndex = 0;
        const videoElement = document.getElementById('videoPlayer');
        const videoTitle = document.getElementById('videoTitle');
        const videoCounter = document.getElementById('videoCounter');
        const prevBtn = document.getElementById('prevBtn');
        const nextBtn = document.getElementById('nextBtn');
        
        function updateUI() {
                // Update video source
            const currentVideo = videoData[currentVideoIndex];
                videoElement.src = currentVideo.url;
                videoElement.poster = currentVideo.thumbnail || '';
                
            // Update video title and counter
                videoTitle.textContent = currentVideo.name;
            videoCounter.textContent = \`\${currentVideoIndex + 1} / \${videoData.length}\`;
                
                // Update button states
                document.querySelectorAll('.btn').forEach((btn, i) => {
                btn.classList.toggle('active', i === currentVideoIndex);
                });
            
            // Update navigation buttons
            prevBtn.disabled = currentVideoIndex === 0;
            nextBtn.disabled = currentVideoIndex === videoData.length - 1;
                
                // Load the video
                videoElement.load();
        }
        
        function playVideo(index) {
            if (index >= 0 && index < videoData.length) {
                currentVideoIndex = index;
                updateUI();
            }
        }
        
        function nextVideo() {
            if (currentVideoIndex < videoData.length - 1) {
                currentVideoIndex++;
                updateUI();
            }
        }
        
        function previousVideo() {
            if (currentVideoIndex > 0) {
                currentVideoIndex--;
                updateUI();
            }
        }
        
        // Keyboard navigation
        document.addEventListener('keydown', function(e) {
            if (e.key === 'ArrowLeft') {
                previousVideo();
            } else if (e.key === 'ArrowRight') {
                nextVideo();
            }
        });
        
        // Initialize with first video
        if (videoData.length > 0) {
            updateUI();
        }
        
        // Handle video errors
        videoElement.addEventListener('error', function(e) {
            console.error('Video load error:', e);
            videoTitle.textContent = 'Error loading video';
            const errorDiv = document.createElement('div');
            errorDiv.className = 'error-message';
            errorDiv.textContent = 'Failed to load video. Please check the URL or try another video.';
            document.querySelector('.controls').insertBefore(errorDiv, document.querySelector('.navigation'));
        });
        
        // Auto-hide error messages after 5 seconds
        setInterval(() => {
            const errorMsg = document.querySelector('.error-message');
            if (errorMsg) {
                errorMsg.remove();
            }
        }, 5000);
    </script>
</body>
</html>`;

    console.log('Generated HTML code length:', htmlCode.length);
    
    try {
      await copyToClipboard(htmlCode);
      toast.dismiss('generating');
      toast.success('HTML code generated and copied to clipboard!');
    } catch (error) {
      toast.dismiss('generating');
      toast.error('Failed to copy HTML code to clipboard');
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
            {videos.length > 0 && (
              <Button onClick={generateCodeSnippet} className="bg-green-600 hover:bg-green-700">
                <Download className="w-4 h-4 mr-2" />
                Generate HTML Code
              </Button>
            )}
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
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => setSelectedVideo(video)}
                      >
                        <Play className="w-4 h-4 mr-1" />
                        Preview
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={async () => {
                          try {
                            await copyToClipboard(video.url);
                            toast.success('Video URL copied to clipboard!');
                          } catch (error) {
                            toast.error('Failed to copy URL');
                          }
                        }}
                      >
                        <Copy className="w-4 h-4 mr-1" />
                        Copy URL
                      </Button>
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
                <VideoContainer 
                  urls={videos.map(video => video.url)}
                  title="Video Player"
                  className="max-w-4xl mx-auto"
                />
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
                  <Button 
                    variant="outline"
                    onClick={() => window.open(selectedVideo.url, '_blank')}
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Open Direct Link
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={async () => {
                      try {
                        await copyToClipboard(selectedVideo.url);
                        toast.success('Video URL copied to clipboard!');
                      } catch (error) {
                        toast.error('Failed to copy URL');
                      }
                    }}
                  >
                    <Copy className="w-4 h-4 mr-2" />
                    Copy URL
                  </Button>
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