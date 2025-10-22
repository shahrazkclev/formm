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
  
  // Player Customization Settings
  const [maxWidth, setMaxWidth] = useState(600);
  const [aspectWidth, setAspectWidth] = useState(16);
  const [aspectHeight, setAspectHeight] = useState(9);
  const [borderRadius, setBorderRadius] = useState(12);
  const [showArrows, setShowArrows] = useState(true);
  const [arrowSize, setArrowSize] = useState(40);
  const [arrowStyle, setArrowStyle] = useState('chevron'); // chevron, arrow, triangle, circle
  const [backgroundColor, setBackgroundColor] = useState('#000000');
  const [playerAccentColor, setPlayerAccentColor] = useState('#3b82f6'); // Blue default
  const [arrowColor, setArrowColor] = useState('#ffffff');
  const [arrowBgColor, setArrowBgColor] = useState('rgba(0,0,0,0.5)');
  
  // Calculate aspect ratio percentage
  const aspectRatio = (aspectHeight / aspectWidth) * 100;

  // Arrow icon options
  const arrowIcons = {
    chevron: { left: '‹', right: '›' },
    arrow: { left: '←', right: '→' },
    triangle: { left: '◀', right: '▶' },
    circle: { left: '⬅', right: '➡' }
  };

  // Theme presets
  const applyTheme = (theme: string) => {
    switch(theme) {
      case 'dark':
        setBackgroundColor('#000000');
        setArrowColor('#ffffff');
        setArrowBgColor('rgba(0,0,0,0.7)');
        break;
      case 'light':
        setBackgroundColor('#ffffff');
        setArrowColor('#000000');
        setArrowBgColor('rgba(255,255,255,0.9)');
        break;
      case 'blue':
        setBackgroundColor('#1e40af');
        setArrowColor('#ffffff');
        setArrowBgColor('rgba(59,130,246,0.8)');
        break;
      case 'purple':
        setBackgroundColor('#7c3aed');
        setArrowColor('#ffffff');
        setArrowBgColor('rgba(167,139,250,0.8)');
        break;
      case 'gradient':
        setBackgroundColor('linear-gradient(135deg, #667eea 0%, #764ba2 100%)');
        setArrowColor('#ffffff');
        setArrowBgColor('rgba(0,0,0,0.5)');
        break;
    }
  };

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

    // Generate clean, minimal HTML like the example
    const htmlCode = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body {
            margin: 0;
            padding: 20px;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            background: #1a1a1a;
        }

        video::-webkit-media-controls-panel { background: ${backgroundColor}; }
        video::-webkit-media-controls-play-button:hover,
        video::-webkit-media-controls-mute-button:hover,
        video::-webkit-media-controls-fullscreen-button:hover { filter: brightness(1.2); }
        video::-webkit-media-controls-timeline { background: rgba(255,255,255,0.3); height: 4px; }
        video::-webkit-media-controls-current-time-display,
        video::-webkit-media-controls-time-remaining-display { color: ${playerAccentColor}; }

        .container {
            position: relative;
            max-width: ${maxWidth}px;
            width: 100%;
            margin: 0 auto;
        }

        .video-wrapper {
            position: relative;
            width: 100%;
            padding-bottom: ${aspectRatio.toFixed(2)}%;
            background: ${backgroundColor};
            border-radius: ${borderRadius}px;
            overflow: hidden;
        }

        video {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            object-fit: contain;
            accent-color: ${playerAccentColor};
        }

        .skeleton {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: linear-gradient(90deg, #1a1a1a 25%, #2a2a2a 50%, #1a1a1a 75%);
            background-size: 200% 100%;
            animation: shimmer 1.5s infinite;
            display: none;
            z-index: 1;
        }

        .skeleton.active {
            display: block;
        }

        @keyframes shimmer {
            0% { background-position: 200% 0; }
            100% { background-position: -200% 0; }
        }

        .nav-btn {
            position: absolute;
            left: 10px;
            top: 50%;
            transform: translateY(-50%);
            background: ${arrowBgColor};
            border: none;
            color: ${arrowColor};
            width: ${arrowSize}px;
            height: ${arrowSize}px;
            border-radius: 50%;
            cursor: pointer;
            font-size: ${arrowSize * 0.4}px;
            opacity: 0.7;
            transition: opacity 0.2s;
            z-index: 10;
            display: flex;
            align-items: center;
            justify-content: center;
        }

        .nav-btn:hover:not(:disabled) {
            opacity: 1;
        }

        .nav-btn:disabled {
            opacity: 0.3;
            cursor: not-allowed;
        }

        #nextBtn {
            left: auto;
            right: 10px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="video-wrapper">
            <div id="skeleton" class="skeleton"></div>
            <video id="vp" controls preload="metadata"></video>
            <video id="preload" style="display: none;" preload="auto"></video>
            ${showArrows ? `<button id="prevBtn" class="nav-btn">‹</button>
            <button id="nextBtn" class="nav-btn">›</button>` : ''}
        </div>
    </div>

    <script>
        const vids = ${JSON.stringify(videoData)};

        let i = 0;
        const v = document.getElementById('vp');
        const p = document.getElementById('preload');
        const skeleton = document.getElementById('skeleton');
        const prevBtn = document.getElementById('prevBtn');
        const nextBtn = document.getElementById('nextBtn');

        function updateButtons() {
            if (prevBtn) prevBtn.disabled = i === 0;
            if (nextBtn) nextBtn.disabled = i === vids.length - 1;
        }

        function preloadAdjacent() {
            if (i < vids.length - 1) {
                p.src = vids[i + 1].url;
                p.load();
            }
        }

        function changeVideo() {
            skeleton.classList.add('active');
            v.src = vids[i].url;
            v.poster = vids[i].thumbnail;
            v.load();
            
            v.onloadeddata = () => {
                skeleton.classList.remove('active');
            };
            
            updateButtons();
            preloadAdjacent();
        }

        function vidPrev() {
            if (i > 0) {
                i--;
                changeVideo();
            }
        }

        function vidNext() {
            if (i < vids.length - 1) {
                i++;
                changeVideo();
            }
        }

        if (prevBtn) prevBtn.onclick = vidPrev;
        if (nextBtn) nextBtn.onclick = vidNext;

        document.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowLeft') vidPrev();
            if (e.key === 'ArrowRight') vidNext();
        });

        // Init
        v.src = vids[0].url;
        v.poster = vids[0].thumbnail;
        updateButtons();
        preloadAdjacent();
    </script>
</body>
</html>`;

    console.log('Generated HTML code length:', htmlCode.length);
    
    try {
      await copyToClipboard(htmlCode);
      toast.success('✓ Copied!', {
        description: 'HTML snippet ready to paste',
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
          <TabsTrigger value="customize" className="data-[state=active]:bg-orange-500 data-[state=active]:text-white text-orange-700">Customize Snippet</TabsTrigger>
          <TabsTrigger value="videos" className="data-[state=active]:bg-orange-500 data-[state=active]:text-white text-orange-700">Videos ({videos.length})</TabsTrigger>
          <TabsTrigger value="upload" className="data-[state=active]:bg-orange-500 data-[state=active]:text-white text-orange-700">Upload</TabsTrigger>
        </TabsList>

        {/* Customize Tab */}
        <TabsContent value="customize" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Settings Panel */}
            <Card className="bg-white/90 border-orange-200/50 shadow-xl">
              <CardHeader>
                <CardTitle className="text-orange-800">Player Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-3">
                  <Label className="text-sm font-semibold text-orange-700">Theme Presets</Label>
                  <div className="grid grid-cols-3 gap-2">
                    <Button size="sm" variant="outline" onClick={() => applyTheme('dark')} className="border-orange-200 text-orange-700 hover:bg-orange-50">Dark</Button>
                    <Button size="sm" variant="outline" onClick={() => applyTheme('light')} className="border-orange-200 text-orange-700 hover:bg-orange-50">Light</Button>
                    <Button size="sm" variant="outline" onClick={() => applyTheme('blue')} className="border-orange-200 text-orange-700 hover:bg-orange-50">Blue</Button>
                    <Button size="sm" variant="outline" onClick={() => applyTheme('purple')} className="border-orange-200 text-orange-700 hover:bg-orange-50">Purple</Button>
                    <Button size="sm" variant="outline" onClick={() => applyTheme('gradient')} className="border-orange-200 text-orange-700 hover:bg-orange-50">Gradient</Button>
                  </div>
                </div>

                <div>
                  <Label className="text-orange-700">Max Width: {maxWidth}px</Label>
                  <Slider
                    value={[maxWidth]}
                    onValueChange={(val) => setMaxWidth(val[0])}
                    min={300}
                    max={1200}
                    step={50}
                    className="mt-2 [&_[role=slider]]:bg-orange-500"
                  />
                </div>

                <div className="space-y-3">
                  <Label className="text-orange-700">Aspect Ratio: {aspectWidth}:{aspectHeight} ({(aspectWidth/aspectHeight).toFixed(2)})</Label>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs text-orange-600">Width</Label>
                      <Input
                        type="number"
                        step="0.1"
                        value={aspectWidth}
                        onChange={(e) => setAspectWidth(parseFloat(e.target.value) || 16)}
                        className="mt-1 border-orange-200 focus:border-orange-500"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-orange-600">Height</Label>
                      <Input
                        type="number"
                        step="0.1"
                        value={aspectHeight}
                        onChange={(e) => setAspectHeight(parseFloat(e.target.value) || 9)}
                        className="mt-1 border-orange-200 focus:border-orange-500"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => { setAspectWidth(16); setAspectHeight(9); }} className="border-orange-200 text-orange-700 hover:bg-orange-50">16:9</Button>
                    <Button size="sm" variant="outline" onClick={() => { setAspectWidth(4); setAspectHeight(3); }} className="border-orange-200 text-orange-700 hover:bg-orange-50">4:3</Button>
                    <Button size="sm" variant="outline" onClick={() => { setAspectWidth(1); setAspectHeight(1); }} className="border-orange-200 text-orange-700 hover:bg-orange-50">1:1</Button>
                    <Button size="sm" variant="outline" onClick={() => { setAspectWidth(21); setAspectHeight(9); }} className="border-orange-200 text-orange-700 hover:bg-orange-50">21:9</Button>
                  </div>
                </div>

                <div>
                  <Label className="text-orange-700">Border Radius: {borderRadius}px</Label>
                  <Slider
                    value={[borderRadius]}
                    onValueChange={(val) => setBorderRadius(val[0])}
                    min={0}
                    max={30}
                    step={2}
                    className="mt-2 [&_[role=slider]]:bg-orange-500"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label className="text-orange-700">Show Navigation Arrows</Label>
                  <Switch
                    checked={showArrows}
                    onCheckedChange={setShowArrows}
                    className="data-[state=checked]:bg-orange-500"
                  />
                </div>

                {showArrows && (
                  <>
                    <div>
                      <Label>Arrow Size: {arrowSize}px</Label>
                      <Slider
                        value={[arrowSize]}
                        onValueChange={(val) => setArrowSize(val[0])}
                        min={30}
                        max={60}
                        step={5}
                        className="mt-2"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Arrow Style</Label>
                      <div className="grid grid-cols-4 gap-2">
                        <Button 
                          size="sm" 
                          variant={arrowStyle === 'chevron' ? 'default' : 'outline'}
                          onClick={() => setArrowStyle('chevron')}
                        >‹ ›</Button>
                        <Button 
                          size="sm" 
                          variant={arrowStyle === 'arrow' ? 'default' : 'outline'}
                          onClick={() => setArrowStyle('arrow')}
                        >← →</Button>
                        <Button 
                          size="sm" 
                          variant={arrowStyle === 'triangle' ? 'default' : 'outline'}
                          onClick={() => setArrowStyle('triangle')}
                        >◀ ▶</Button>
                        <Button 
                          size="sm" 
                          variant={arrowStyle === 'circle' ? 'default' : 'outline'}
                          onClick={() => setArrowStyle('circle')}
                        >⬅ ➡</Button>
                      </div>
                    </div>
                  </>
                )}

                <div className="space-y-3 pt-4 border-t">
                  <Label className="text-sm font-semibold">Colors</Label>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs text-muted-foreground">Background</Label>
                      <div className="flex gap-2 mt-1">
                        <Input
                          type="color"
                          value={backgroundColor}
                          onChange={(e) => setBackgroundColor(e.target.value)}
                          className="w-12 h-9 p-1 cursor-pointer"
                        />
                        <Input
                          type="text"
                          value={backgroundColor}
                          onChange={(e) => setBackgroundColor(e.target.value)}
                          className="flex-1 text-xs"
                          placeholder="#000000"
                        />
                      </div>
                    </div>

                    <div>
                      <Label className="text-xs text-muted-foreground">Player Controls</Label>
                      <div className="flex gap-2 mt-1">
                        <Input
                          type="color"
                          value={playerAccentColor}
                          onChange={(e) => setPlayerAccentColor(e.target.value)}
                          className="w-12 h-9 p-1 cursor-pointer"
                        />
                        <Input
                          type="text"
                          value={playerAccentColor}
                          onChange={(e) => setPlayerAccentColor(e.target.value)}
                          className="flex-1 text-xs"
                          placeholder="#3b82f6"
                        />
                      </div>
                    </div>
                  </div>

                  {showArrows && (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs text-muted-foreground">Arrow Icon</Label>
                        <div className="flex gap-2 mt-1">
                          <Input
                            type="color"
                            value={arrowColor}
                            onChange={(e) => setArrowColor(e.target.value)}
                            className="w-12 h-9 p-1 cursor-pointer"
                          />
                          <Input
                            type="text"
                            value={arrowColor}
                            onChange={(e) => setArrowColor(e.target.value)}
                            className="flex-1 text-xs"
                            placeholder="#ffffff"
                          />
                        </div>
                      </div>

                      <div>
                        <Label className="text-xs text-muted-foreground">Arrow Circle</Label>
                        <Input
                          type="text"
                          value={arrowBgColor}
                          onChange={(e) => setArrowBgColor(e.target.value)}
                          className="mt-1 text-xs"
                          placeholder="rgba(0,0,0,0.5)"
                        />
                      </div>
                    </div>
                  )}
                </div>

                <Button 
                  onClick={generateCodeSnippet}
                  className="w-full bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 active:scale-95"
                  size="lg"
                  disabled={videos.length === 0}
                >
                  <Copy className="w-4 h-4 mr-2 transition-transform duration-300 group-hover:rotate-12" />
                  Generate & Copy HTML Snippet
                </Button>
              </CardContent>
            </Card>

            {/* Live Preview */}
            <Card className="bg-white/90 border-orange-200/50 shadow-xl">
              <CardHeader>
                <CardTitle className="text-orange-800">Live Preview</CardTitle>
              </CardHeader>
              <CardContent>
                {videos.length > 0 ? (
                  <div style={{ position: 'relative', maxWidth: `${maxWidth}px`, margin: '0 auto' }}>
                    <div style={{ 
                      position: 'relative',
                      width: '100%',
                      paddingBottom: `${aspectRatio.toFixed(2)}%`,
                      background: backgroundColor, 
                      borderRadius: `${borderRadius}px`, 
                      overflow: 'hidden'
                    }}>
                      <video 
                        controls
                        preload="none"
                        style={{ 
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          width: '100%',
                          height: '100%',
                          objectFit: 'contain',
                          accentColor: playerAccentColor
                        }}
                        src={videos.filter(v => !v.key.startsWith('thumbnails/') && !v.key.match(/\.(jpg|jpeg|png|gif|bmp|webp|svg|ico)$/i))[0]?.url}
                      />
                    </div>
                    {showArrows && (
                      <>
                        <div style={{
                          position: 'absolute',
                          left: '10px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          background: arrowBgColor,
                          border: 'none',
                          color: arrowColor,
                          width: `${arrowSize}px`,
                          height: `${arrowSize}px`,
                          borderRadius: '50%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: `${arrowSize * 0.5}px`,
                          opacity: 0.7,
                          zIndex: 10
                        }}>{arrowIcons[arrowStyle as keyof typeof arrowIcons].left}</div>
                        <div style={{
                          position: 'absolute',
                          right: '10px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          background: arrowBgColor,
                          border: 'none',
                          color: arrowColor,
                          width: `${arrowSize}px`,
                          height: `${arrowSize}px`,
                          borderRadius: '50%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: `${arrowSize * 0.5}px`,
                          opacity: 0.7,
                          zIndex: 10
                        }}>{arrowIcons[arrowStyle as keyof typeof arrowIcons].right}</div>
                      </>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <Play className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>Add videos to see preview</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
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
                              uploadThumbnail(video.uid, file);
                            }
                          }}
                          className="hidden"
                          id={`thumbnail-${video.uid}`}
                        />
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => document.getElementById(`thumbnail-${video.uid}`)?.click()}
                          disabled={uploadingThumbnail}
                        >
                          <Image className="w-4 h-4 mr-1" />
                          Auto Thumbnail
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