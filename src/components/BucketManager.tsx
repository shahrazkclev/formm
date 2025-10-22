import React, { useState, useEffect, useCallback, lazy, Suspense } from 'react';
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
import { Checkbox } from './ui/checkbox';
import { Progress } from './ui/progress';
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

// Lazy load VideoContainer since it's only used in player tab
const VideoContainer = lazy(() => import('./VideoContainer'));

interface VideoFile {
  key: string;
  url: string;
  size: number;
  lastModified: string;
  thumbnail?: string;
  uid: string;
  name: string;
  status?: string;
  duration?: number;
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
  // Cloudflare Stream configuration
  const STREAM_API_TOKEN = 'nz3V5siUHVPhnjJxYm_cHdWiV-kNCRC-9gYsl1DQ';
  const STREAM_ACCOUNT_ID = 'b5f7bbc74ed9bf4c44b19d1f3b937e22';
  const STREAM_CUSTOMER_CODE = 'aanhjdlw75bwi5za';
  const STREAM_API_BASE = `https://api.cloudflare.com/client/v4/accounts/${STREAM_ACCOUNT_ID}/stream`;
  
  const [videos, setVideos] = useState<VideoFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedVideo, setSelectedVideo] = useState<VideoFile | null>(null);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadingThumbnail, setUploadingThumbnail] = useState(false);
  
  // Delete states
  const [videoToDelete, setVideoToDelete] = useState<VideoFile | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [bulkDeleteMode, setBulkDeleteMode] = useState(false);
  const [selectedVideos, setSelectedVideos] = useState<Set<string>>(new Set());
  

  const fetchVideos = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`${STREAM_API_BASE}`, {
        headers: {
          'Authorization': `Bearer ${STREAM_API_TOKEN}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      const streamVideos = data.result || [];
      
      // Transform Stream videos to match our VideoFile interface
      const transformedVideos = streamVideos.map((video: {
        uid: string;
        size?: number;
        created?: string;
        thumbnail?: string;
        meta?: { name?: string };
        filename?: string;
        status?: string;
        duration?: number;
      }) => ({
        key: video.uid,
        url: `https://customer-${STREAM_CUSTOMER_CODE}.cloudflarestream.com/${video.uid}/iframe`,
        size: video.size || 0,
        lastModified: video.created || new Date().toISOString(),
        thumbnail: video.thumbnail || undefined,
        uid: video.uid,
        name: video.meta?.name || video.filename || 'Untitled Video',
        status: video.status,
        duration: video.duration
      }));
      
      setVideos(transformedVideos);
    } catch (error) {
      console.error('Failed to fetch videos:', error);
      toast.error('Failed to fetch videos from Cloudflare Stream.');
      setVideos([]);
    } finally {
      setLoading(false);
    }
  }, [STREAM_API_BASE, STREAM_API_TOKEN, STREAM_CUSTOMER_CODE]);

  // Auto-fetch videos on component load
  useEffect(() => {
    fetchVideos();
  }, [fetchVideos]);

  const uploadVideo = async () => {
    if (!uploadFile) return;
    
    setUploading(true);
    setUploadProgress(0);
    
    try {
      const formData = new FormData();
      formData.append('file', uploadFile);
      
      const response = await fetch(`${STREAM_API_BASE}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${STREAM_API_TOKEN}`,
        },
        body: formData
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.errors?.[0]?.message || `Upload failed: ${response.statusText}`);
      }
      
      const result = await response.json();
      toast.success('Video uploaded successfully to Cloudflare Stream!');
          setUploadFile(null);
          setUploadProgress(0);
          fetchVideos();
    } catch (error) {
      console.error('Upload failed:', error);
      toast.error(`Upload failed: ${error.message}`);
    } finally {
        setUploading(false);
    }
  };

  const uploadThumbnail = async (videoUid: string, file: File) => {
    setUploadingThumbnail(true);
    try {
      // Note: Cloudflare Stream doesn't support custom thumbnails via API
      // Thumbnails are automatically generated from the video
      toast.info('Cloudflare Stream automatically generates thumbnails from your videos');
    } catch (error) {
      console.error('Thumbnail upload failed:', error);
      toast.error('Failed to upload thumbnail');
    } finally {
      setUploadingThumbnail(false);
    }
  };

  const deleteVideo = async (videoUid: string) => {
    setDeleting(true);
    try {
      const response = await fetch(`${STREAM_API_BASE}/${videoUid}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${STREAM_API_TOKEN}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.errors?.[0]?.message || `Delete failed: ${response.statusText}`);
      }
      
      toast.success('Video deleted successfully from Cloudflare Stream!');
      setVideoToDelete(null);
      fetchVideos();
    } catch (error) {
      console.error('Delete failed:', error);
      toast.error(`Failed to delete video: ${error.message}`);
    } finally {
      setDeleting(false);
    }
  };

  const deleteBulkVideos = async () => {
    if (selectedVideos.size === 0) {
      toast.error('No videos selected');
      return;
    }

    setDeleting(true);
    let successCount = 0;
    let failCount = 0;

    for (const videoUid of Array.from(selectedVideos)) {
      try {
        const response = await fetch(`${STREAM_API_BASE}/${videoUid}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${STREAM_API_TOKEN}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (response.ok) {
          successCount++;
        } else {
          failCount++;
        }
      } catch (error) {
        console.error(`Failed to delete ${videoUid}:`, error);
        failCount++;
      }
    }

    setDeleting(false);
    setSelectedVideos(new Set());
    setBulkDeleteMode(false);

    if (successCount > 0) {
      toast.success(`Successfully deleted ${successCount} video(s) from Cloudflare Stream`);
    }
    if (failCount > 0) {
      toast.error(`Failed to delete ${failCount} video(s)`);
    }

    fetchVideos();
  };

  const toggleVideoSelection = (videoKey: string) => {
    const newSelection = new Set(selectedVideos);
    if (newSelection.has(videoKey)) {
      newSelection.delete(videoKey);
    } else {
      newSelection.add(videoKey);
    }
    setSelectedVideos(newSelection);
  };

  const selectAllVideos = () => {
    const actualVideos = videos.filter(video => 
      !video.key.startsWith('thumbnails/') && 
      !video.key.match(/\.(jpg|jpeg|png|gif|bmp|webp|svg|ico)$/i)
    );
    setSelectedVideos(new Set(actualVideos.map(v => v.key)));
  };

  const deselectAllVideos = () => {
    setSelectedVideos(new Set());
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

    // Transform videos to match glass-video-carousel.html format
    const videoData = videos.map(video => ({
      streamId: video.uid,
      name: video.name
    }));

    // Generate HTML based on glass-video-carousel.html template
    const htmlCode = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Glass Video Carousel</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            background: transparent;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }

        .carousel-container {
            width: 100%;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
        }

        .video-wrapper {
            position: relative;
            aspect-ratio: 1 / 1;
            border-radius: 16px;
            overflow: hidden;
            background: #000;
        }

        .stream-iframe {
            width: 100%;
            height: 100%;
            border: none;
            border-radius: 16px;
            cursor: pointer;
        }

        .controls-overlay {
            position: absolute;
            bottom: 0;
            left: 0;
            right: 0;
            padding: 24px;
            pointer-events: none;
        }

        .controls-panel {
            backdrop-filter: blur(8px);
            background: rgba(0, 0, 0, 0.2); 
            border-radius: 12px;
            border: 1px solid rgba(255, 255, 255, 0.1); 
            padding: 10px;
            pointer-events: auto;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
        }

        .controls-inner {
            display: flex;
            align-items: center;
            justify-content: space-between;
        }

        .controls-left {
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .controls-right {
            display: flex;
            align-items: center; 
            gap: 6px;
        }

        .thumbnail-carousel {
            display: flex;
            align-items: center;
            gap: 8px;
            overflow-x: auto;
            scrollbar-width: none;
            -ms-overflow-style: none;
            padding: 4px 0;
        }

        .thumbnail-carousel::-webkit-scrollbar {
            display: none;
        }

        .thumbnail-item {
            position: relative;
            flex-shrink: 0;
            width: 60px;
            height: 40px;
            border-radius: 8px;
            overflow: hidden;
            cursor: pointer;
            transition: all 0.2s ease;
            border: 2px solid transparent;
        }

        .thumbnail-item:hover {
            transform: scale(1.05);
            border-color: rgba(255, 255, 255, 0.3);
        }

        .thumbnail-item.active {
            border-color: rgba(255, 255, 255, 0.8);
            box-shadow: 0 0 10px rgba(255, 255, 255, 0.3);
        }

        .thumbnail-img {
            width: 100%;
            height: 100%;
            object-fit: cover;
            background: rgba(0, 0, 0, 0.3);
        }

        .thumbnail-loading {
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-size: 10px;
        }

        .btn {
            backdrop-filter: blur(8px);
            background: rgba(0, 0, 0, 0.3); 
            border: 1px solid rgba(255, 255, 255, 0.15); 
            border-radius: 10px;
            cursor: pointer;
            display: flex; 
            align-items: center; 
            justify-content: center; 
            transition: all 0.2s;
        }

        .btn:hover {
            background: rgba(0, 0, 0, 0.45); 
            transform: scale(1.05);
        }

        .btn-play {
            width: 42px;
            height: 42px;
            position: relative;
        }

        .btn-small {
            width: 36px;
            height: 36px;
        }

        .counter {
            color: white;
            font-size: 13px;
            font-weight: 500;
            padding: 5px 10px;
            border-radius: 8px;
            backdrop-filter: blur(8px);
            background: rgba(0, 0, 0, 0.2); 
            border: 1px solid rgba(255, 255, 255, 0.1); 
            text-shadow: 0 1px 1px rgba(0,0,0,0.3); 
            line-height: 1;
        }

        .video-title {
            margin-top: 16px;
            text-align: center;
            color: rgba(255, 255, 255, 0.7);
            font-size: 14px;
        }

        svg {
            width: 25px;
            height: 22px;
            stroke: white;
            fill: none;
            stroke-width: 2;
            stroke-linecap: round;
            stroke-linejoin: round;
            filter: drop-shadow(0 1px 1px rgba(0,0,0,0.3)); 
        }

        .btn-play svg {
            width: 24px;
            height: 24px;
            position: absolute;
            transition: all 0.2s ease-out;
        }

        /* Play/Pause Icon Transitions */
        #playIcon {
            opacity: 1;
            transform: scale(1);
        }

        #pauseIcon {
            opacity: 0;
            transform: scale(0.7);
        }

        .btn-play.is-playing #playIcon {
            opacity: 0;
            transform: scale(0.7);
        }
        
        .btn-play.is-playing #pauseIcon {
            opacity: 1;
            transform: scale(1);
        }

        .loading-overlay {
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            display: flex;
            align-items: center;
            justify-content: center;
            background: rgba(0, 0, 0, 0.3);
            backdrop-filter: blur(4px);
            opacity: 0;
            pointer-events: none;
            transition: opacity 0.3s;
        }

        .loading-overlay.show {
            opacity: 1;
        }

        .loader {
            width: 48px;
            height: 48px;
            border: 4px solid rgba(255, 255, 255, 0.2);
            border-top-color: white;
            border-radius: 50%;
            animation: spin 1s linear infinite;
        }

        @keyframes spin {
            to { transform: rotate(360deg); }
        }

        @media (max-width: 768px) {
            .carousel-container {
                padding: 12px;
            }
            .controls-panel {
                padding: 12px;
            }
        }
    </style>
</head>
<body>
    <div class="carousel-container">
        <div class="video-wrapper">
            <iframe id="streamPlayer" class="stream-iframe" loading="lazy" allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture;" allowfullscreen="true"></iframe>
            
            <div class="loading-overlay" id="loadingOverlay">
                <div class="loader"></div>
        </div>
            
            <div class="controls-overlay">
                <div class="controls-panel">
                    <div class="controls-inner">
                        <div class="controls-left">
                            <button class="btn btn-play" id="playBtn">
                                <svg id="playIcon" viewBox="0 0 24 24">
                                    <polygon points="10 8 16 12 10 16 10 8"></polygon>
                                </svg>
                                <svg id="pauseIcon" viewBox="0 0 24 24">
                                    <line x1="10" y1="8" x2="10" y2="16"></line>
                                    <line x1="14" y1="8" x2="14" y2="16"></line>
                                </svg>
                            </button>
                            
                            <button class="btn btn-small" id="muteBtn">
                                <svg id="muteIcon" viewBox="0 0 24 24">
                                    <path d="M11 5L6 9H2v6h4l5 4V5z"></path>
                                    <line x1="23" y1="9" x2="17" y2="15"></line>
                                    <line x1="17" y1="9" x2="23" y2="15"></line>
                                </svg>
                                <svg id="volumeIcon" style="display: none;" viewBox="0 0 24 24">
                                    <path d="M11 5L6 9H2v6h4l5 4V5z"></path>
                                    <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path>
                                </svg>
                            </button>
                        </div>

                        <div class="controls-right">
                            <button class="btn btn-small" id="prevBtn">
                                <svg>
                                    <polyline points="15 18 9 12 15 6"></polyline>
                                </svg>
                            </button>
                            
                            <div class="thumbnail-carousel" id="thumbnailCarousel">
                                <!-- Thumbnails will be dynamically generated here -->
                            </div>
                            
                            <button class="btn btn-small" id="nextBtn">
                                <svg>
                                    <polyline points="9 18 15 12 9 6"></polyline>
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        
    </div>

    <script>
        var vids = ${JSON.stringify(videoData)};

        var currentIndex = 0;
        var isPlaying = false;
        var isMuted = true;
        var preloadedVideos = {};
        var streamDomain = "customer-aanhjdlw75bwi5za.cloudflarestream.com";

        var streamPlayer = document.getElementById('streamPlayer');
        var playBtn = document.getElementById('playBtn');
        var muteBtn = document.getElementById('muteBtn');
        var prevBtn = document.getElementById('prevBtn');
        var nextBtn = document.getElementById('nextBtn');
        var thumbnailCarousel = document.getElementById('thumbnailCarousel');
        var playIcon = document.getElementById('playIcon');
        var pauseIcon = document.getElementById('pauseIcon');
        var muteIcon = document.getElementById('muteIcon');
        var volumeIcon = document.getElementById('volumeIcon');
        var loadingOverlay = document.getElementById('loadingOverlay');

        function preloadVideo(index) {
            if (preloadedVideos[index]) return;
            
            var vid = document.createElement('video');
            vid.src = buildStreamUrl(vids[index].streamId);
            vid.preload = 'auto';
            preloadedVideos[index] = vid;
        }

        function preloadNearbyVideos(currentIndex) {
            var nextIndex = (currentIndex + 1) % vids.length;
            var prevIndex = (currentIndex - 1 + vids.length) % vids.length;
            
            preloadVideo(nextIndex);
            preloadVideo(prevIndex);
        }

        function buildStreamUrl(streamId) {
            return \`https://\${streamDomain}/\${streamId}/iframe?preload=true&poster=https%3A%2F%2F\${streamDomain}%2F\${streamId}%2Fthumbnails%2Fthumbnail.jpg%3Ftime%3D%26height%3D600\`;
        }

        function buildThumbnailUrl(streamId) {
            return \`https://\${streamDomain}/\${streamId}/thumbnails/thumbnail.jpg?time=&height=120\`;
        }

        function createThumbnailCarousel() {
            thumbnailCarousel.innerHTML = '';
            
            vids.forEach(function(vid, index) {
                var thumbnailItem = document.createElement('div');
                thumbnailItem.className = 'thumbnail-item';
                thumbnailItem.dataset.index = index;
                
                if (index === currentIndex) {
                    thumbnailItem.classList.add('active');
                }
                
                var loadingDiv = document.createElement('div');
                loadingDiv.className = 'thumbnail-loading';
                loadingDiv.textContent = '...';
                thumbnailItem.appendChild(loadingDiv);
                
                var img = new Image();
                img.className = 'thumbnail-img';
                img.loading = 'lazy';
                img.onload = function() {
                    loadingDiv.remove();
                    thumbnailItem.appendChild(img);
                };
                img.onerror = function() {
                    loadingDiv.textContent = '?';
                };
                img.src = buildThumbnailUrl(vid.streamId);
                
                thumbnailItem.addEventListener('click', function() {
                    jumpToVideo(index);
                });
                
                thumbnailCarousel.appendChild(thumbnailItem);
            });
        }

        function updateThumbnailCarousel() {
            var thumbnails = thumbnailCarousel.querySelectorAll('.thumbnail-item');
            thumbnails.forEach(function(thumb, index) {
                if (index === currentIndex) {
                    thumb.classList.add('active');
                } else {
                    thumb.classList.remove('active');
                }
            });
        }

        function jumpToVideo(index) {
            if (index >= 0 && index < vids.length) {
                currentIndex = index;
                loadVideo(currentIndex);
                updateThumbnailCarousel();
            }
        }

        function showLoading() {
            loadingOverlay.classList.add('show');
        }

        function hideLoading() {
            loadingOverlay.classList.remove('show');
        }

        function loadVideo(index) {
            isPlaying = false;
            playBtn.classList.remove('is-playing');
            
            var streamId = vids[index].streamId;
            var streamUrl = buildStreamUrl(streamId);
            console.log('Loading video:', streamUrl);
            streamPlayer.src = streamUrl;
            
            updateThumbnailCarousel();
            preloadNearbyVideos(index);
        }

        streamPlayer.addEventListener('load', function() {
            console.log('Stream iframe loaded');
            hideLoading();
        });

        streamPlayer.addEventListener('error', function(e) {
            console.log('Stream iframe error:', e);
            hideLoading();
        });

        function togglePlay() {
            isPlaying = !isPlaying;
            playBtn.classList.toggle('is-playing', isPlaying);
            console.log('Play button clicked, isPlaying:', isPlaying);
        }

        function toggleMute() {
            isMuted = !isMuted;
            updateMuteIcon();
            console.log('Mute button clicked, isMuted:', isMuted);
        }

        function updateMuteIcon() {
            muteIcon.style.display = isMuted ? 'block' : 'none';
            volumeIcon.style.display = isMuted ? 'none' : 'block';
        }

        function nextVideo() {
            currentIndex = (currentIndex + 1) % vids.length;
            loadVideo(currentIndex);
        }

        function prevVideo() {
            currentIndex = (currentIndex - 1 + vids.length) % vids.length;
            loadVideo(currentIndex);
        }

        playBtn.addEventListener('click', togglePlay);
        muteBtn.addEventListener('click', toggleMute);
        prevBtn.addEventListener('click', prevVideo);
        nextBtn.addEventListener('click', nextVideo);
        streamPlayer.addEventListener('click', togglePlay);

        createThumbnailCarousel();
        loadVideo(currentIndex);
    </script>
</body>
</html>`;

    console.log('Generated HTML code length:', htmlCode.length);
    
    try {
      await copyToClipboard(htmlCode);
      toast.success('✓ Copied!', {
        description: 'Glass video carousel HTML ready to paste',
        duration: 2000
      });
    } catch (error) {
      console.error('Failed to copy:', error);
      toast.error('Copy failed', {
        description: 'Please try again',
        duration: 2000
      });
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
        {/* Header */}
        <div className="text-center space-y-4 py-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-orange-500 to-amber-600 bg-clip-text text-transparent">
            Video Snippet Maker
          </h1>
          <p className="text-lg text-orange-700/70 max-w-2xl mx-auto">
            Upload videos to Cloudflare Stream, customize the player, and generate clean HTML snippets for your website
          </p>
        </div>

      {/* Cloudflare Stream Status */}
      <Card className="border-2 border-orange-200/50 shadow-xl backdrop-blur-sm bg-white/90">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-orange-800">
            <div className={`w-3 h-3 rounded-full ${
              videos.length > 0 ? 'bg-green-500' : 
              loading ? 'bg-orange-500 animate-pulse' : 
              'bg-gray-400'
            }`}></div>
            Cloudflare Stream Status
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Button 
              onClick={fetchVideos} 
              disabled={loading} 
              className="flex-1 bg-orange-500 hover:bg-orange-600 text-white border-0"
            >
              {loading ? 'Loading...' : 'Refresh Videos'}
            </Button>
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-orange-800">
                {videos.length > 0 ? `${videos.length} videos found in Stream` : 
                 loading ? 'Loading...' : 
                 'No videos found'}
              </p>
              <p className="text-sm text-orange-600/70">
                Account: {STREAM_ACCOUNT_ID}
              </p>
            </div>
            <button 
              onClick={() => {
                console.log('Generate HTML button clicked!');
                generateCodeSnippet();
              }}
              className="group relative bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white px-6 py-3 rounded-lg font-medium transition-all duration-300 transform hover:scale-105 hover:shadow-lg active:scale-95"
            >
              <span className="flex items-center gap-2">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="transition-transform duration-300 group-hover:rotate-12">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="7,10 12,15 17,10"/>
                <line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              Generate HTML Code
              </span>
              <div className="absolute inset-0 bg-white/20 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            </button>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="customize" className="space-y-6">
        <TabsList className="bg-white/80 border border-orange-200/50 shadow-lg">
          <TabsTrigger value="customize" className="data-[state=active]:bg-orange-500 data-[state=active]:text-white text-orange-700">Generate</TabsTrigger>
          <TabsTrigger value="videos" className="data-[state=active]:bg-orange-500 data-[state=active]:text-white text-orange-700">Videos ({videos.length})</TabsTrigger>
          <TabsTrigger value="upload" className="data-[state=active]:bg-orange-500 data-[state=active]:text-white text-orange-700">Upload</TabsTrigger>
        </TabsList>

        {/* Generate Tab */}
        <TabsContent value="customize" className="space-y-6">
          <Card className="bg-white/90 border-orange-200/50 shadow-xl">
              <CardHeader>
              <CardTitle className="text-orange-800">Generate HTML Snippet</CardTitle>
              <p className="text-orange-600/70 text-sm">
                Create a clean, embeddable HTML snippet based on your glass-video-carousel.html template
              </p>
              </CardHeader>
              <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
                  <h3 className="font-semibold text-orange-800 mb-2">What you'll get:</h3>
                  <ul className="text-sm text-orange-700 space-y-1">
                    <li>• Clean HTML based on your glass-video-carousel.html template</li>
                    <li>• Cloudflare Stream iframe integration</li>
                    <li>• Glass morphism design with blur effects</li>
                    <li>• Thumbnail carousel navigation</li>
                    <li>• Responsive design for all devices</li>
                    <li>• No external dependencies - pure HTML/CSS/JS</li>
                  </ul>
                </div>

                <div className="text-center">
                <Button 
                  onClick={generateCodeSnippet}
                    className="bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 active:scale-95 px-8 py-4 text-lg"
                  disabled={videos.length === 0}
                >
                    <Copy className="w-5 h-5 mr-3 transition-transform duration-300 group-hover:rotate-12" />
                  Generate & Copy HTML Snippet
                </Button>
                  {videos.length === 0 && (
                    <p className="text-orange-600/70 text-sm mt-2">
                      Upload some videos first to generate the snippet
                    </p>
                    )}
                  </div>
                  </div>
              </CardContent>
            </Card>
        </TabsContent>

        {/* Videos Tab */}
        <TabsContent value="videos" className="space-y-4">
          {videos.length === 0 ? (
            <Card className="bg-white/90 border-orange-200/50 shadow-xl">
              <CardContent className="text-center py-12">
                <p className="text-orange-700">No videos found in your Stream</p>
                <p className="text-sm text-orange-600/70 mt-2">
                  Upload some videos to get started
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Bulk Delete Controls */}
              <Card className="bg-white/90 border-orange-200/50 shadow-xl">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <Switch
                        checked={bulkDeleteMode}
                        onCheckedChange={(checked) => {
                          setBulkDeleteMode(checked);
                          if (!checked) {
                            setSelectedVideos(new Set());
                          }
                        }}
                      />
                      <Label className="text-sm font-medium text-orange-700">
                        Bulk Delete Mode {bulkDeleteMode && selectedVideos.size > 0 && `(${selectedVideos.size} selected)`}
                      </Label>
                    </div>
                    
                    {bulkDeleteMode && (
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={selectAllVideos}
                          className="border-orange-200 text-orange-700 hover:bg-orange-50"
                        >
                          Select All
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={deselectAllVideos}
                          className="border-orange-200 text-orange-700 hover:bg-orange-50"
                        >
                          Deselect All
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={deleteBulkVideos}
                          disabled={selectedVideos.size === 0 || deleting}
                          className="bg-red-500 hover:bg-red-600"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          {deleting ? 'Deleting...' : `Delete ${selectedVideos.size} Video(s)`}
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </>
          )}
          
          {videos.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {videos.map((video, index) => (
                <Card key={video.key} className={`overflow-hidden bg-white/90 border-orange-200/50 shadow-xl ${bulkDeleteMode && selectedVideos.has(video.key) ? 'ring-2 ring-orange-500' : ''}`}>
                  <div className="aspect-video bg-muted relative">
                    {video.thumbnail ? (
                      <img 
                        src={video.thumbnail} 
                        alt={video.key}
                        loading="lazy"
                        decoding="async"
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
                    
                    {/* Bulk Delete Checkbox */}
                    {bulkDeleteMode && (
                      <div className="absolute top-2 right-2 bg-background/80 backdrop-blur-sm rounded p-1">
                        <Checkbox
                          checked={selectedVideos.has(video.key)}
                          onCheckedChange={() => toggleVideoSelection(video.key)}
                        />
                      </div>
                    )}
                  </div>
                  
                  <CardContent className="p-4 space-y-3">
                    <div>
                      <h3 className="font-medium truncate" title={video.name}>
                        {video.name}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {formatFileSize(video.size)} • {video.duration ? `${Math.round(video.duration)}s` : 'Unknown duration'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        UID: {video.uid} • Status: {video.status || 'Unknown'}
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
                        <Image className="w-4 h-4 text-orange-600/70" />
                        <span className="text-sm text-orange-700">
                          {video.thumbnail ? 'Auto-generated thumbnail' : 'Generating thumbnail...'}
                        </span>
                      </div>
                      
                      <div className="flex gap-2">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              uploadThumbnail(video.uid, file);
                            }
                          }}
                          className="hidden"
                          id={`thumbnail-${video.uid}`}
                        />
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => {
                            if (video.thumbnail) {
                              window.open(video.thumbnail, '_blank');
                            } else {
                              toast.info('Thumbnail is still being generated by Cloudflare Stream');
                            }
                          }}
                          disabled={!video.thumbnail}
                          className="border-orange-200 text-orange-700 hover:bg-orange-50"
                        >
                          <Image className="w-4 h-4 mr-1" />
                          {video.thumbnail ? 'View Thumbnail' : 'Generating...'}
                        </Button>
                        <Button 
                          size="sm" 
                          variant="destructive"
                          onClick={() => setVideoToDelete(video)}
                          disabled={deleting}
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
                  <Suspense fallback={
                    <div className="flex items-center justify-center py-12">
                      <div className="text-center space-y-4">
                        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
                        <p className="text-muted-foreground">Loading player...</p>
                      </div>
                    </div>
                  }>
                    <VideoContainer 
                      urls={videos.map(video => video.url)}
                      title="Video Player"
                      className="max-w-4xl mx-auto"
                    />
                  </Suspense>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Upload Tab */}
        <TabsContent value="upload" className="space-y-4">
          <Card className="bg-white/90 border-orange-200/50 shadow-xl">
            <CardHeader>
              <CardTitle className="text-orange-800">Upload Video</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <input
                  type="file"
                  accept="video/*"
                  onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                  className="w-full p-2 border rounded"
                  disabled={uploading}
                />
              </div>
              
              {uploadFile && (
                <div className="p-4 bg-muted rounded-lg space-y-3">
                  <div>
                    <p className="font-medium text-foreground">{uploadFile.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatFileSize(uploadFile.size)} • {uploadFile.type}
                    </p>
                  </div>
                  
                  {/* Upload Progress */}
                  {uploading && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Uploading...</span>
                        <span className="font-medium text-primary">{uploadProgress}%</span>
                      </div>
                      <Progress value={uploadProgress} className="h-2" />
                    </div>
                  )}
                </div>
              )}
              
              <Button 
                onClick={uploadVideo} 
                disabled={!uploadFile || uploading}
                className="w-full bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300"
              >
                <Upload className="w-4 h-4 mr-2" />
                {uploading ? `Uploading... ${uploadProgress}%` : 'Upload Video'}
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
                  preload="metadata"
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

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!videoToDelete} onOpenChange={(open) => !open && setVideoToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Video</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{videoToDelete?.key}</strong>?
              <br />
              This action cannot be undone and will permanently delete the video from your storage.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => videoToDelete && deleteVideo(videoToDelete.uid)}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      </div>
    </div>
  );
}