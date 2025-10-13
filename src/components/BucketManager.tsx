import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Upload, Play, Copy, ExternalLink, Image, Trash2, Download } from 'lucide-react';
import { toast } from 'sonner';

interface VideoFile {
  key: string;
  url: string;
  size: number;
  lastModified: string;
  thumbnail?: string;
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

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard!');
  };

  const generateCodeSnippet = () => {
    if (videos.length === 0) {
      toast.error('No videos to generate code for');
      return;
    }

    const videoData = videos.map(video => ({
      url: video.url,
      thumbnail: video.thumbnail || ''
    }));

    const htmlCode = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Video Player</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
        .video-container { max-width: 800px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
        video { width: 100%; height: auto; display: block; }
        .controls { padding: 15px; background: #f8f9fa; border-top: 1px solid #e9ecef; }
        .btn { padding: 8px 16px; margin: 5px; border: none; border-radius: 4px; cursor: pointer; background: #007bff; color: white; }
        .btn:hover { background: #0056b3; }
        .btn.active { background: #28a745; }
    </style>
</head>
<body>
    <div class="video-container">
        <video id="videoPlayer" controls poster="">
            <source src="" type="video/mp4">
            Your browser does not support the video tag.
        </video>
        <div class="controls">
            <button class="btn" onclick="playVideo(0)">Video 1</button>
            <button class="btn" onclick="playVideo(1)">Video 2</button>
            <button class="btn" onclick="playVideo(2)">Video 3</button>
        </div>
    </div>

    <script>
        const videoData = ${JSON.stringify(videoData, null, 2)};
        let currentVideoIndex = 0;
        const videoElement = document.getElementById('videoPlayer');
        
        function playVideo(index) {
            if (index >= 0 && index < videoData.length) {
                currentVideoIndex = index;
                const currentVideo = videoData[index];
                videoElement.src = currentVideo.url;
                videoElement.poster = currentVideo.thumbnail;
                
                // Update button states
                document.querySelectorAll('.btn').forEach((btn, i) => {
                    btn.classList.toggle('active', i === index);
                });
            }
        }
        
        // Initialize with first video
        if (videoData.length > 0) {
            playVideo(0);
        }
    </script>
</body>
</html>`;

    copyToClipboard(htmlCode);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6 bg-background text-foreground">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold text-foreground">Video Anywhere Box</h1>
        <p className="text-muted-foreground">Manage your Cloudflare R2 videos and generate embeddable code</p>
      </div>

      {/* Connection Status */}
      <Card>
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

      <Tabs defaultValue="videos" className="space-y-4">
        <TabsList>
          <TabsTrigger value="videos">Videos ({videos.length})</TabsTrigger>
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
                        onClick={() => copyToClipboard(video.url)}
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
                    onClick={() => copyToClipboard(selectedVideo.url)}
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
  );
}