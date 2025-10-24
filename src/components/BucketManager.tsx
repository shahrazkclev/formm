import React, { useState, useEffect, useCallback } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Upload, Copy, Trash2, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { Progress } from './ui/progress';
import { supabase } from '@/integrations/supabase/client';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from './ui/alert-dialog';

interface VideoFile {
  id: string;
  uid: string;
  name: string;
  stream_url: string;
  thumbnail_url?: string;
  size: number;
  duration: number;
  status: string;
  created_at: string;
}

export default function BucketManager() {
  const STREAM_API_TOKEN = 'nz3V5siUHVPhnjJxYm_cHdWiV-kNCRC-9gYsl1DQ';
  const STREAM_ACCOUNT_ID = 'b5f7bbc74ed9bf4c44b19d1f3b937e22';
  const STREAM_CUSTOMER_CODE = 'aanhjdlw75bwi5za';
  const STREAM_API_BASE = `https://api.cloudflare.com/client/v4/accounts/${STREAM_ACCOUNT_ID}/stream`;
  
  const [videos, setVideos] = useState<VideoFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [filesToUpload, setFilesToUpload] = useState<File[]>([]);
  const [currentUploadIndex, setCurrentUploadIndex] = useState(0);
  const [videoToDelete, setVideoToDelete] = useState<VideoFile | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [thumbnailTime, setThumbnailTime] = useState<{video: VideoFile, time: number} | null>(null);

  // Fetch videos from Supabase
  const fetchVideos = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('videos')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setVideos(data || []);
    } catch (error) {
      console.error('Failed to fetch videos:', error);
      toast.error('Failed to fetch videos from database');
      setVideos([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchVideos();
  }, [fetchVideos]);

  const uploadVideos = async () => {
    if (filesToUpload.length === 0) return;
    
    setUploading(true);
    
    try {
      for (let i = 0; i < filesToUpload.length; i++) {
        const file = filesToUpload[i];
        setCurrentUploadIndex(i);
        setUploadProgress(10);
        
        // Validate file type
        if (!file.type.startsWith('video/')) {
          throw new Error(`${file.name} is not a valid video file. Please select video files only.`);
        }
        
        console.log('Uploading video:', file.name, 'Type:', file.type, 'Size:', file.size);
        
        // Step 1: Upload to Cloudflare Stream
        const formData = new FormData();
        formData.append('file', file);
        
        setUploadProgress(30);
        const response = await fetch(`${STREAM_API_BASE}`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${STREAM_API_TOKEN}`,
          },
          body: formData
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          console.error('Cloudflare Stream upload error:', errorData);
          throw new Error(errorData.errors?.[0]?.message || `Upload failed: ${response.statusText}`);
        }
        
        const result = await response.json();
        const videoData = result.result;
        
        setUploadProgress(70);
        
        // Step 2: Save to Supabase
        const { error } = await supabase.from('videos').insert({
          uid: videoData.uid,
          name: videoData.meta?.name || file.name,
          stream_url: `https://customer-${STREAM_CUSTOMER_CODE}.cloudflarestream.com/${videoData.uid}/iframe`,
          thumbnail_url: `https://customer-${STREAM_CUSTOMER_CODE}.cloudflarestream.com/${videoData.uid}/thumbnails/thumbnail.jpg`,
          size: videoData.size || 0,
          duration: videoData.duration || 0,
          status: typeof videoData.status === 'object' ? videoData.status.state : 'ready'
        });
        
        if (error) throw error;
        
        setUploadProgress(100);
        toast.success(`${file.name} uploaded!`);
      }
      
      setFilesToUpload([]);
      setUploadProgress(0);
      setCurrentUploadIndex(0);
      fetchVideos();
    } catch (error: any) {
      console.error('Upload failed:', error);
      toast.error(`Upload failed: ${error.message || 'Unknown error'}`);
      setUploadProgress(0);
    } finally {
      setUploading(false);
    }
  };

  const deleteVideo = async (video: VideoFile) => {
    setDeleting(true);
    try {
      // Delete from Cloudflare Stream
      const response = await fetch(`${STREAM_API_BASE}/${video.uid}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${STREAM_API_TOKEN}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Delete failed: ${response.statusText}`);
      }
      
      // Delete from Supabase
      const { error } = await supabase
        .from('videos')
        .delete()
        .eq('uid', video.uid);
      
      if (error) throw error;
      
      toast.success('Video deleted successfully!');
      setVideoToDelete(null);
      fetchVideos();
    } catch (error: any) {
      console.error('Delete failed:', error);
      toast.error(`Failed to delete: ${error.message}`);
    } finally {
      setDeleting(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        return true;
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        document.body.appendChild(textArea);
        textArea.select();
        const successful = document.execCommand('copy');
        textArea.remove();
        return successful;
      }
    } catch (error) {
      console.error('Failed to copy:', error);
      throw error;
    }
  };

  const setThumbnailFrame = async (video: VideoFile, timeInSeconds: number) => {
    try {
      console.log('=== SET THUMBNAIL FRAME START ===');
      console.log('Video UID:', video.uid, 'Time:', timeInSeconds);
      
      // Update the video record with thumbnail time
      const { error: updateError } = await supabase
        .from('videos')
        .update({ 
          thumbnail_time: timeInSeconds
        })
        .eq('uid', video.uid);
      
      if (updateError) {
        console.error('Database update error:', JSON.stringify(updateError, null, 2));
        throw new Error(`Failed to update database: ${updateError.message}`);
      }
      
      console.log('=== THUMBNAIL FRAME SET SUCCESS ===');
      toast.success('Thumbnail frame set successfully!');
      setThumbnailTime(null);
      fetchVideos();
    } catch (error: any) {
      console.error('=== THUMBNAIL FRAME SET FAILED ===');
      console.error('Error details:', error);
      toast.error(error.message || 'Failed to set thumbnail frame');
    }
  };

  const generateCodeSnippet = async () => {
    if (videos.length === 0) {
      toast.error('No videos to generate code for. Please upload some videos first.');
      return;
    }

    // Transform videos to match glass-video-carousel.html format
    const videoData = videos.map(video => ({
      streamId: video.uid,
      name: video.name,
      thumbnailTime: video.thumbnail_time // Include custom thumbnail time
    }));

    // Read the glass template (simplified version - just the critical parts)
    const htmlCode = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Glass Video Carousel</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { background: transparent; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
        .carousel-container { width: 100%; max-width: 800px; margin: 0 auto; padding: 20px; }
        .video-player-container { width: 100%; border-radius: 16px; overflow: hidden; border: 1px solid rgba(255, 255, 255, 0.1); display: flex; flex-direction: column; }
        .video-wrapper { position: relative; width: 100%; aspect-ratio: 1920/1398; border-radius: 16px 16px 0 0; overflow: hidden; background: #000; }
        .stream-iframe { width: 100%; height: 100%; border: none; cursor: pointer; }
        .controls-panel { backdrop-filter: blur(8px); background: rgba(0, 0, 0, 0.3); border-radius: 0 0 16px 16px; padding: 16px 20px; display: flex; align-items: center; }
        .controls-inner { 
            display: flex; 
            align-items: center; 
            justify-content: space-between; 
            gap: 16px; 
            width: 100%; 
            padding: 0 20px; 
        }
        .thumbnail-carousel { 
            display: flex; 
            align-items: center; 
            gap: 8px; 
            overflow-x: auto; 
            overflow-y: hidden;
            flex: 1; 
            justify-content: flex-start; 
            scrollbar-width: none;
            -ms-overflow-style: none;
            max-width: calc(100% - 100px);
            scroll-behavior: smooth;
        }
        .thumbnail-carousel::-webkit-scrollbar { display: none; }
        .thumbnail-item { 
            flex-shrink: 0; 
            width: 60px; 
            height: 42px; 
            border-radius: 6px; 
            overflow: hidden; 
            cursor: pointer; 
            transition: border-color 0.2s ease; 
            border: 2px solid transparent; 
        }
        .thumbnail-item:hover { 
            border-color: rgba(255, 255, 255, 0.4); 
        }
        .thumbnail-item.active { 
            border-color: rgba(255, 255, 255, 0.9); 
            box-shadow: 0 0 8px rgba(255, 255, 255, 0.2); 
        }
        .thumbnail-img { width: 100%; height: 100%; object-fit: cover; background: rgba(0, 0, 0, 0.3); }
        .btn { backdrop-filter: blur(8px); background: rgba(0, 0, 0, 0.3); border: 1px solid rgba(255, 255, 255, 0.15); border-radius: 10px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s; width: 36px; height: 36px; }
        .btn:hover { background: rgba(0, 0, 0, 0.45); transform: scale(1.05); }
        svg { width: 22px; height: 22px; stroke: white; fill: none; stroke-width: 2; }
        
        /* Responsive design */
        @media (max-width: 768px) {
            .carousel-container { padding: 10px; }
            .controls-panel { padding: 12px 16px; }
            .controls-inner { padding: 0 16px; gap: 12px; }
            .thumbnail-carousel { max-width: calc(100% - 80px); }
            .thumbnail-item { width: 50px; height: 35px; }
        }
        
        @media (max-width: 480px) {
            .carousel-container { padding: 8px; }
            .controls-panel { padding: 10px 12px; }
            .controls-inner { padding: 0 12px; gap: 8px; }
            .thumbnail-carousel { max-width: calc(100% - 70px); }
            .thumbnail-item { width: 45px; height: 32px; }
        }
    </style>
</head>
<body>
    <div class="carousel-container">
        <div class="video-player-container">
            <div class="video-wrapper">
                <iframe id="streamPlayer" class="stream-iframe" loading="lazy" allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture;" allowfullscreen="true"></iframe>
            </div>
            <div class="controls-panel">
                <div class="controls-inner">
                    <button class="btn" id="prevBtn"><svg><polyline points="15 18 9 12 15 6"></polyline></svg></button>
                    <div class="thumbnail-carousel" id="thumbnailCarousel"></div>
                    <button class="btn" id="nextBtn"><svg><polyline points="9 18 15 12 9 6"></polyline></svg></button>
                </div>
            </div>
        </div>
    </div>
    <script>
        var vids = ${JSON.stringify(videoData)};
        var currentIndex = 0;
        var streamDomain = "customer-${STREAM_CUSTOMER_CODE}.cloudflarestream.com";
        var streamPlayer = document.getElementById('streamPlayer');
        var thumbnailCarousel = document.getElementById('thumbnailCarousel');
        
        function buildStreamUrl(streamId, thumbnailTime) {
            var url = \`https://\${streamDomain}/\${streamId}/iframe?preload=true\`;
            if (thumbnailTime !== null && thumbnailTime !== undefined) {
                var posterUrl = \`https://\${streamDomain}/\${streamId}/thumbnails/thumbnail.jpg?time=\${thumbnailTime}s&height=600\`;
                url += \`&poster=\${encodeURIComponent(posterUrl)}\`;
            }
            return url;
        }
        
        function buildThumbnailUrl(streamId) {
            return \`https://\${streamDomain}/\${streamId}/thumbnails/thumbnail.jpg?time=0&height=60\`;
        }
        
        function buildMainThumbnailUrl(streamId) {
            return \`https://\${streamDomain}/\${streamId}/thumbnails/thumbnail.jpg?time=0&height=400\`;
        }
        
        function createThumbnails() {
            thumbnailCarousel.innerHTML = '';
            vids.forEach(function(vid, index) {
                var div = document.createElement('div');
                div.className = 'thumbnail-item' + (index === currentIndex ? ' active' : '');
                div.onclick = function() { jumpToVideo(index); };
                
                // Create thumbnail image directly
                var img = document.createElement('img');
                img.className = 'thumbnail-img';
                img.loading = 'lazy';
                img.onload = function() {
                    // Image loaded successfully
                };
                img.onerror = function() {
                    // Try alternative thumbnail URL
                    var altUrl = buildThumbnailUrl(vid.streamId).replace('thumbnail.jpg', 'thumbnail.png');
                    img.src = altUrl;
                    img.onerror = function() {
                        // Show fallback icon
                        img.style.display = 'none';
                        var fallback = document.createElement('div');
                        fallback.className = 'thumbnail-fallback';
                        fallback.textContent = '📹';
                        fallback.style.cssText = 'width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; background: rgba(0,0,0,0.5); color: white; font-size: 16px;';
                        div.appendChild(fallback);
                    };
                };
                // Use custom thumbnail time if available, otherwise use default
                if (vid.thumbnailTime !== null && vid.thumbnailTime !== undefined) {
                    img.src = \`https://\${streamDomain}/\${vid.streamId}/thumbnails/thumbnail.jpg?time=\${vid.thumbnailTime}s&height=60\`;
                } else {
                    img.src = buildThumbnailUrl(vid.streamId);
                }
                div.appendChild(img);
                thumbnailCarousel.appendChild(div);
            });
        }
        
        function jumpToVideo(index) {
            currentIndex = index;
            var currentVideo = vids[index];
            
            // Use Cloudflare Stream's native poster system with time-based thumbnails
            streamPlayer.src = buildStreamUrl(currentVideo.streamId, currentVideo.thumbnailTime);
            
            updateThumbnails();
        }
        
        function updateThumbnails() {
            var thumbnails = thumbnailCarousel.querySelectorAll('.thumbnail-item');
            thumbnails.forEach(function(thumb, i) {
                thumb.className = 'thumbnail-item' + (i === currentIndex ? ' active' : '');
            });
            
            // Auto-scroll to keep active thumbnail in view
            var activeThumbnail = thumbnailCarousel.querySelector('.thumbnail-item.active');
            if (activeThumbnail) {
                var carouselRect = thumbnailCarousel.getBoundingClientRect();
                var thumbnailRect = activeThumbnail.getBoundingClientRect();
                var scrollLeft = thumbnailCarousel.scrollLeft;
                
                // Check if thumbnail is outside left edge
                if (thumbnailRect.left < carouselRect.left) {
                    thumbnailCarousel.scrollLeft = scrollLeft - (carouselRect.left - thumbnailRect.left) - 20;
                }
                // Check if thumbnail is outside right edge
                else if (thumbnailRect.right > carouselRect.right) {
                    thumbnailCarousel.scrollLeft = scrollLeft + (thumbnailRect.right - carouselRect.right) + 20;
                }
            }
        }
        
        function nextVideo() {
            jumpToVideo((currentIndex + 1) % vids.length);
        }
        
        function prevVideo() {
            jumpToVideo((currentIndex - 1 + vids.length) % vids.length);
        }
        
        document.getElementById('prevBtn').onclick = prevVideo;
        document.getElementById('nextBtn').onclick = nextVideo;
        
        
        createThumbnails();
        jumpToVideo(0);
    </script>
</body>
</html>`;
    
    try {
      await copyToClipboard(htmlCode);
      toast.success('✓ HTML Copied!', {
        description: 'Glass video carousel ready to paste',
        duration: 2000
      });
    } catch (error) {
      console.error('Failed to copy:', error);
      toast.error('Copy failed. Please try again');
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
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50">
      <div className="max-w-6xl mx-auto p-6 space-y-6">
        <div className="text-center space-y-4 py-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-orange-500 to-amber-600 bg-clip-text text-transparent">
            Video Carousel Generator
          </h1>
          <p className="text-lg text-orange-700/70 max-w-2xl mx-auto">
            Upload videos, manage your library, and generate HTML code
          </p>
        </div>

        {/* Upload Section */}
        <Card className="border-2 border-orange-200/50 shadow-xl backdrop-blur-sm bg-white/90">
          <CardHeader>
            <CardTitle className="text-orange-800">Upload Video</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                type="file"
                accept="video/mp4,video/avi,video/mov,video/wmv,video/flv,video/webm,video/mkv"
                multiple
                onChange={(e) => {
                  const files = Array.from(e.target.files || []);
                  // Filter out non-video files
                  const videoFiles = files.filter(file => file.type.startsWith('video/'));
                  if (videoFiles.length !== files.length) {
                    toast.warning('Some files were skipped - only video files are allowed');
                  }
                  setFilesToUpload(videoFiles);
                }}
                disabled={uploading}
                className="flex-1"
              />
              <Button 
                onClick={uploadVideos}
                disabled={filesToUpload.length === 0 || uploading}
                className="bg-orange-500 hover:bg-orange-600 text-white"
              >
                <Upload className="w-4 h-4 mr-2" />
                {uploading ? 'Uploading...' : `Upload${filesToUpload.length > 1 ? ` ${filesToUpload.length}` : ''}`}
              </Button>
            </div>
            
            {filesToUpload.length > 0 && !uploading && (
              <p className="text-sm text-orange-600">
                {filesToUpload.length} file{filesToUpload.length > 1 ? 's' : ''} selected
              </p>
            )}
            
            {uploading && uploadProgress > 0 && (
              <div className="space-y-2">
                <Progress value={uploadProgress} className="h-2" />
                <p className="text-sm text-orange-600 text-center">
                  File {currentUploadIndex + 1} of {filesToUpload.length}: {uploadProgress}% uploaded
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Videos Library */}
        <Card className="border-2 border-orange-200/50 shadow-xl backdrop-blur-sm bg-white/90">
          <CardHeader>
            <CardTitle className="flex items-center justify-between text-orange-800">
              <span>Video Library ({videos.length})</span>
              <div className="flex gap-2">
                <Button 
                  onClick={fetchVideos} 
                  disabled={loading}
                  variant="outline"
                  size="sm"
                >
                  <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                </Button>
                <Button 
                  onClick={generateCodeSnippet}
                  disabled={videos.length === 0}
                  className="bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white"
                  size="sm"
                >
                  <Copy className="w-4 h-4 mr-2" />
                  Generate HTML
                </Button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-center text-orange-600">Loading videos...</p>
            ) : videos.length === 0 ? (
              <p className="text-center text-orange-600">No videos yet. Upload your first video above!</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {videos.map((video) => (
                  <Card key={video.id} className="overflow-hidden border border-orange-200/50">
                    <div className="relative aspect-video bg-black">
                      {video.thumbnail_url ? (
                        <img 
                          src={video.thumbnail_url} 
                          alt={video.name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-white">
                          No thumbnail
                        </div>
                      )}
                    </div>
                    <CardContent className="p-4 space-y-2">
                      <h3 className="font-medium text-orange-800 truncate">{video.name}</h3>
                      <div className="flex items-center justify-between text-sm text-orange-600/70">
                        <span>{formatFileSize(video.size)}</span>
                        <Badge variant="secondary">{video.status}</Badge>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          onClick={() => {
                            const time = prompt(`Enter thumbnail time in seconds for "${video.name}":`, '1');
                            if (time && !isNaN(parseFloat(time))) {
                              setThumbnailTime({ video, time: parseFloat(time) });
                            }
                          }}
                        >
                          <Upload className="w-4 h-4 mr-2" />
                          Set Frame
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          className="flex-1"
                          onClick={() => setVideoToDelete(video)}
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!videoToDelete} onOpenChange={() => setVideoToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Video?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete "{videoToDelete?.name}" from Cloudflare Stream and the database.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => videoToDelete && deleteVideo(videoToDelete)}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Thumbnail Frame Confirmation Dialog */}
      <AlertDialog open={!!thumbnailTime} onOpenChange={() => setThumbnailTime(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Set Thumbnail Frame?</AlertDialogTitle>
            <AlertDialogDescription>
              Set frame at {thumbnailTime?.time}s as thumbnail for "{thumbnailTime?.video.name}"?
              This will use that frame from the video as the thumbnail.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => thumbnailTime && setThumbnailFrame(thumbnailTime.video, thumbnailTime.time)}
              className="bg-orange-500 hover:bg-orange-600 text-white"
            >
              Set Frame
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
