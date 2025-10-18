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
  
  // Player Customization Settings
  const [maxWidth, setMaxWidth] = useState(600);
  const [aspectWidth, setAspectWidth] = useState(16);
  const [aspectHeight, setAspectHeight] = useState(9);
  const [borderRadius, setBorderRadius] = useState(12);
  const [showArrows, setShowArrows] = useState(true);
  const [arrowSize, setArrowSize] = useState(40);
  const [arrowStyle, setArrowStyle] = useState('chevron'); // chevron, arrow, triangle, circle
  const [autoplay, setAutoplay] = useState(false);
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

    // Generate clean embeddable HTML with customization
    const currentArrows = arrowIcons[arrowStyle as keyof typeof arrowIcons];
    const htmlCode = `<style>
video::-webkit-media-controls-panel { background: ${backgroundColor}; }
video::-webkit-media-controls-play-button:hover,
video::-webkit-media-controls-mute-button:hover,
video::-webkit-media-controls-fullscreen-button:hover { filter: brightness(1.2); }
video::-webkit-media-controls-timeline { background: rgba(255,255,255,0.3); height: 4px; }
video::-webkit-media-controls-current-time-display,
video::-webkit-media-controls-time-remaining-display { color: ${playerAccentColor}; }
</style>
<div style="position: relative; max-width: ${maxWidth}px; margin: 0 auto;">
    <div style="position: relative; width: 100%; padding-bottom: ${aspectRatio.toFixed(2)}%; background: ${backgroundColor}; border-radius: ${borderRadius}px; overflow: hidden;">
        <video id="vp" controls ${autoplay ? 'autoplay' : ''} style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; object-fit: contain; accent-color: ${playerAccentColor};"></video>
    </div>
    ${showArrows ? `<button onclick="vidPrev()" style="position: absolute; left: 10px; top: 50%; transform: translateY(-50%); background: ${arrowBgColor}; border: none; color: ${arrowColor}; width: ${arrowSize}px; height: ${arrowSize}px; border-radius: 50%; cursor: pointer; font-size: ${arrowSize * 0.5}px; opacity: 0.7; transition: opacity 0.2s; z-index: 10;" onmouseover="this.style.opacity='1'" onmouseout="this.style.opacity='0.7'">${currentArrows.left}</button>
    <button onclick="vidNext()" style="position: absolute; right: 10px; top: 50%; transform: translateY(-50%); background: ${arrowBgColor}; border: none; color: ${arrowColor}; width: ${arrowSize}px; height: ${arrowSize}px; border-radius: 50%; cursor: pointer; font-size: ${arrowSize * 0.5}px; opacity: 0.7; transition: opacity 0.2s; z-index: 10;" onmouseover="this.style.opacity='1'" onmouseout="this.style.opacity='0.7'">${currentArrows.right}</button>` : ''}
</div>
<script>
const vids=${JSON.stringify(videoData)};let i=0;const v=document.getElementById('vp');
function vidLoad(){v.src=vids[i].url;if(vids[i].thumbnail)v.poster=vids[i].thumbnail;v.load();v.play();}
function vidPrev(){if(i>0){i--;vidLoad();}}
function vidNext(){if(i<vids.length-1){i++;vidLoad();}}
v.addEventListener('ended',()=>{if(i<vids.length-1)vidNext();});
vidLoad();
</script>`;

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
            Video Snippet Maker
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Load videos from your bucket, customize the player, and generate clean HTML snippets for your website
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

      <Tabs defaultValue="customize" className="space-y-6">
        <TabsList>
          <TabsTrigger value="customize">Customize Snippet</TabsTrigger>
          <TabsTrigger value="videos">Videos ({videos.length})</TabsTrigger>
          <TabsTrigger value="upload">Upload</TabsTrigger>
        </TabsList>

        {/* Customize Tab */}
        <TabsContent value="customize" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Settings Panel */}
            <Card>
              <CardHeader>
                <CardTitle>Player Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-3">
                  <Label className="text-sm font-semibold">Theme Presets</Label>
                  <div className="grid grid-cols-3 gap-2">
                    <Button size="sm" variant="outline" onClick={() => applyTheme('dark')}>Dark</Button>
                    <Button size="sm" variant="outline" onClick={() => applyTheme('light')}>Light</Button>
                    <Button size="sm" variant="outline" onClick={() => applyTheme('blue')}>Blue</Button>
                    <Button size="sm" variant="outline" onClick={() => applyTheme('purple')}>Purple</Button>
                    <Button size="sm" variant="outline" onClick={() => applyTheme('gradient')}>Gradient</Button>
                  </div>
                </div>

                <div>
                  <Label>Max Width: {maxWidth}px</Label>
                  <Slider
                    value={[maxWidth]}
                    onValueChange={(val) => setMaxWidth(val[0])}
                    min={300}
                    max={1200}
                    step={50}
                    className="mt-2"
                  />
                </div>

                <div className="space-y-3">
                  <Label>Aspect Ratio: {aspectWidth}:{aspectHeight} ({(aspectWidth/aspectHeight).toFixed(2)})</Label>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs text-muted-foreground">Width</Label>
                      <Input
                        type="number"
                        step="0.1"
                        value={aspectWidth}
                        onChange={(e) => setAspectWidth(parseFloat(e.target.value) || 16)}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Height</Label>
                      <Input
                        type="number"
                        step="0.1"
                        value={aspectHeight}
                        onChange={(e) => setAspectHeight(parseFloat(e.target.value) || 9)}
                        className="mt-1"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => { setAspectWidth(16); setAspectHeight(9); }}>16:9</Button>
                    <Button size="sm" variant="outline" onClick={() => { setAspectWidth(4); setAspectHeight(3); }}>4:3</Button>
                    <Button size="sm" variant="outline" onClick={() => { setAspectWidth(1); setAspectHeight(1); }}>1:1</Button>
                    <Button size="sm" variant="outline" onClick={() => { setAspectWidth(21); setAspectHeight(9); }}>21:9</Button>
                  </div>
                </div>

                <div>
                  <Label>Border Radius: {borderRadius}px</Label>
                  <Slider
                    value={[borderRadius]}
                    onValueChange={(val) => setBorderRadius(val[0])}
                    min={0}
                    max={30}
                    step={2}
                    className="mt-2"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label>Show Navigation Arrows</Label>
                  <Switch
                    checked={showArrows}
                    onCheckedChange={setShowArrows}
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

                <div className="flex items-center justify-between">
                  <Label>Autoplay</Label>
                  <Switch
                    checked={autoplay}
                    onCheckedChange={setAutoplay}
                  />
                </div>

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
                  className="w-full"
                  size="lg"
                  disabled={videos.length === 0}
                >
                  <Copy className="w-4 h-4 mr-2" />
                  Generate & Copy HTML Snippet
                </Button>
              </CardContent>
            </Card>

            {/* Live Preview */}
            <Card>
              <CardHeader>
                <CardTitle>Live Preview</CardTitle>
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
                        autoPlay={autoplay}
                        muted
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