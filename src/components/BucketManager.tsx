import { useState, useEffect } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Card } from "./ui/card";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Slider } from "./ui/slider";
import { Switch } from "./ui/switch";
import { Copy, Check, Upload, RefreshCw, Settings, Download } from "lucide-react";
import { toast } from "sonner";

interface VideoFile {
  key: string;
  url: string;
  size: number;
  lastModified: string;
  thumbnail?: string;
}

interface PlayerConfig {
  width: number;
  height: number;
  autoplay: boolean;
  muted: boolean;
  loop: boolean;
  controls: boolean;
  showCounter: boolean;
  showArrows: boolean;
  theme: 'dark' | 'light';
  borderRadius: number;
}

const BucketManager = () => {
  const [bucketUrl, setBucketUrl] = useState("https://vid-just.cleverpoly-store.workers.dev");
  const [bucketName, setBucketName] = useState("");
  const [videos, setVideos] = useState<VideoFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [uploadingThumbnail, setUploadingThumbnail] = useState(false);
  const [selectedVideoForThumbnail, setSelectedVideoForThumbnail] = useState<string>("");
  const [testMode, setTestMode] = useState(false);
  const [diagnostics, setDiagnostics] = useState<any>(null);
  
  const [config, setConfig] = useState<PlayerConfig>({
    width: 800,
    height: 450,
    autoplay: false,
    muted: true,
    loop: false,
    controls: true,
    showCounter: true,
    showArrows: true,
    theme: 'dark',
    borderRadius: 12
  });

  const [showThumbnails, setShowThumbnails] = useState(true);

  // Auto-fetch videos when component loads
  useEffect(() => {
    if (bucketUrl && !testMode) {
      fetchVideos();
    }
  }, [bucketUrl, testMode]);

  // Fetch videos from bucket
  const fetchVideos = async () => {
    if (testMode) {
      // Demo mode with sample videos
      setLoading(true);
      setTimeout(() => {
        setVideos([
          {
            key: "sample-video-1.mp4",
            url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
            size: 15728640,
            lastModified: new Date().toISOString(),
            thumbnail: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/images/BigBuckBunny.jpg"
          },
          {
            key: "sample-video-2.mp4", 
            url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4",
            size: 25165824,
            lastModified: new Date().toISOString(),
            thumbnail: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/images/ElephantsDream.jpg"
          }
        ]);
        toast.success("Demo mode: Loaded 2 sample videos");
        setLoading(false);
      }, 1000);
      return;
    }

    if (!bucketUrl) {
      toast.error("Please enter your Cloudflare Worker URL");
      return;
    }
    
    setLoading(true);
    try {
      const response = await fetch(`${bucketUrl}/list-videos?t=${Date.now()}`);
      console.log('Fetch response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('API Response data:', data);
        setVideos(data.videos || []);
        toast.success(`Found ${data.videos?.length || 0} videos`);
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Failed to fetch videos' }));
        console.error('API Error response:', errorData);
        throw new Error(errorData.error || `Failed to fetch videos (${response.status})`);
      }
    } catch (error) {
      console.error('Error fetching videos:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch videos';
      
      if (errorMessage.includes('Failed to fetch')) {
        toast.error("Cannot connect to your Cloudflare Worker. Please check your Worker URL and ensure it's deployed.");
      } else if (errorMessage.includes('404')) {
        toast.error("Worker endpoint not found. Make sure your Worker is deployed with the correct code.");
      } else if (errorMessage.includes('CORS')) {
        toast.error("CORS error. Check your Worker's CORS configuration.");
      } else {
        toast.error(`Failed to fetch videos: ${errorMessage}`);
      }
    } finally {
      setLoading(false);
    }
  };

  // Upload video to bucket
  const uploadVideo = async () => {
    if (!uploadFile) {
      toast.error("Please select a file to upload");
      return;
    }

    if (testMode) {
      toast.info("Demo mode: Upload simulation. In real mode, this would upload to your R2 bucket.");
      setUploadFile(null);
      const fileInput = document.getElementById('video-upload') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
      return;
    }

    if (!bucketUrl) {
      toast.error("Please enter your Cloudflare Worker URL first");
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', uploadFile);
      
      const response = await fetch(`${bucketUrl}/upload`, {
        method: 'POST',
        body: formData
      });

      if (response.ok) {
        const result = await response.json();
        toast.success("Video uploaded successfully!");
        setUploadFile(null);
        // Clear the file input
        const fileInput = document.getElementById('video-upload') as HTMLInputElement;
        if (fileInput) fileInput.value = '';
        fetchVideos(); // Refresh the list
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Upload failed' }));
        throw new Error(errorData.error || `Upload failed with status ${response.status}`);
      }
    } catch (error) {
      console.error('Upload error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to upload video';
      
      if (errorMessage.includes('Failed to fetch')) {
        toast.error("Cannot connect to your Cloudflare Worker. Please check your Worker URL and ensure it's deployed.");
      } else if (errorMessage.includes('404')) {
        toast.error("Worker endpoint not found. Make sure your Worker is deployed with the correct code.");
      } else if (errorMessage.includes('CORS')) {
        toast.error("CORS error. Check your Worker's CORS configuration.");
      } else {
        toast.error(`Upload failed: ${errorMessage}`);
      }
    } finally {
      setUploading(false);
    }
  };

  // Upload thumbnail for a video
  const uploadThumbnail = async (file?: File, videoKey?: string) => {
    const fileToUpload = file || thumbnailFile;
    const videoToUse = videoKey || selectedVideoForThumbnail;
    
    
    if (!fileToUpload || !videoToUse || !bucketUrl) {
      toast.error("Please select a thumbnail file and video");
      return;
    }

    setUploadingThumbnail(true);
    try {
      const formData = new FormData();
      formData.append('file', fileToUpload);
      formData.append('videoKey', videoToUse);

      const response = await fetch(`${bucketUrl}/upload-thumbnail`, {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const result = await response.json();
        toast.success(`Thumbnail for ${videoToUse} uploaded successfully!`);
        fetchVideos(); // Refresh the video list
        setThumbnailFile(null);
        setSelectedVideoForThumbnail("");
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Thumbnail upload failed' }));
        throw new Error(errorData.error || `Thumbnail upload failed (${response.status})`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Thumbnail upload failed';
      toast.error(`Thumbnail upload failed: ${errorMessage}`);
    } finally {
      setUploadingThumbnail(false);
    }
  };

  // Generate HTML code snippet
  const generateCodeSnippet = () => {
    const videoData = videos.map(v => ({
      url: v.url,
      thumbnail: v.thumbnail || v.url // Use thumbnail if available, fallback to video URL
    }));
    const aspectRatio = config.height / config.width;
    
    return `<!-- Video Carousel - Generated by Video Anywhere Box -->
<div id="video-carousel-${Date.now()}" style="
  position: relative; 
  width: ${config.width}px; 
  height: ${config.height}px; 
  margin: 0 auto;
  border-radius: ${config.borderRadius}px;
  overflow: hidden;
  background: ${config.theme === 'dark' ? '#1a1a1a' : '#f5f5f5'};
  box-shadow: 0 4px 20px rgba(0,0,0,0.1);
">
  <style>
    .video-carousel-container {
      position: relative;
      width: 100%;
      height: 100%;
    }
    .video-player {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    .video-counter {
      position: absolute;
      top: 10px;
      right: 10px;
      background: rgba(0,0,0,0.7);
      color: white;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 12px;
      z-index: 10;
    }
    .nav-arrow {
      position: absolute;
      top: 50%;
      transform: translateY(-50%);
      background: rgba(0,0,0,0.7);
      color: white;
      border: none;
      width: 40px;
      height: 40px;
      border-radius: 50%;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10;
      transition: background 0.2s;
    }
    .nav-arrow:hover {
      background: rgba(0,0,0,0.9);
    }
    .nav-arrow:disabled {
      opacity: 0.3;
      cursor: not-allowed;
    }
    .nav-arrow.prev {
      left: 10px;
    }
    .nav-arrow.next {
      right: 10px;
    }
  </style>
  
  <div class="video-carousel-container">
    ${config.showCounter ? `<div class="video-counter" id="counter">1 / ${videoData.length}</div>` : ''}
    
    <video 
      id="current-video" 
      class="video-player"
      ${config.autoplay ? 'autoplay' : ''}
      ${config.muted ? 'muted' : ''}
      ${config.loop ? 'loop' : ''}
      ${config.controls ? 'controls' : ''}
      playsinline
      preload="metadata"
    >
      Your browser does not support the video tag.
    </video>
    
    ${config.showArrows && videoData.length > 1 ? `
      <button class="nav-arrow prev" id="prev-btn" onclick="previousVideo()">‹</button>
      <button class="nav-arrow next" id="next-btn" onclick="nextVideo()">›</button>
    ` : ''}
  </div>
  
  <script>
    const videoData = ${JSON.stringify(videoData)};
    let currentIndex = 0;
    const videoElement = document.getElementById('current-video');
    const counterElement = document.getElementById('counter');
    const prevBtn = document.getElementById('prev-btn');
    const nextBtn = document.getElementById('next-btn');
    
    function loadVideo(index) {
      if (index >= 0 && index < videoData.length) {
        currentIndex = index;
        const currentVideo = videoData[index];
        videoElement.src = currentVideo.url;
        
        // Set poster (thumbnail) if available
        if (currentVideo.thumbnail && currentVideo.thumbnail !== currentVideo.url) {
          videoElement.poster = currentVideo.thumbnail;
        } else {
          videoElement.poster = '';
        }
        
        if (counterElement) {
          counterElement.textContent = \`\${index + 1} / \${videoData.length}\`;
        }
        if (prevBtn) prevBtn.disabled = index === 0;
        if (nextBtn) nextBtn.disabled = index === videoData.length - 1;
      }
    }
    
    function nextVideo() {
      if (currentIndex < videoData.length - 1) {
        loadVideo(currentIndex + 1);
      }
    }
    
    function previousVideo() {
      if (currentIndex > 0) {
        loadVideo(currentIndex - 1);
      }
    }
    
    // Keyboard navigation
    document.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft') previousVideo();
      if (e.key === 'ArrowRight') nextVideo();
    });
    
    // Initialize
    loadVideo(0);
  </script>
</div>`;
  };

  const copyToClipboard = () => {
    const code = generateCodeSnippet();
    navigator.clipboard.writeText(code);
    setCopied(true);
    toast.success("Code copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadCode = () => {
    const code = generateCodeSnippet();
    const blob = new Blob([code], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'video-carousel.html';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Code downloaded!");
  };

  // Diagnostic function to test worker connectivity
  const runDiagnostics = async () => {
    if (!bucketUrl) {
      toast.error("Please enter your Worker URL first");
      return;
    }

    setLoading(true);
    const results: any = {
      workerUrl: bucketUrl,
      timestamp: new Date().toISOString(),
      tests: []
    };

    try {
      // Test 1: Basic connectivity
      const startTime = Date.now();
      const response = await fetch(`${bucketUrl}/list-videos`);
      const endTime = Date.now();
      
      results.tests.push({
        name: "Basic Connectivity",
        status: response.ok ? "PASS" : "FAIL",
        details: `Status: ${response.status}, Response time: ${endTime - startTime}ms`,
        response: response.ok ? "Worker is responding" : `HTTP ${response.status} error`
      });

      if (response.ok) {
        // Test 2: JSON parsing
        try {
          const data = await response.json();
          results.tests.push({
            name: "JSON Response",
            status: "PASS",
            details: `Received valid JSON with ${data.videos?.length || 0} videos`,
            response: data
          });
        } catch (jsonError) {
          results.tests.push({
            name: "JSON Response",
            status: "FAIL",
            details: "Failed to parse JSON response",
            response: jsonError
          });
        }
      }

      // Test 3: CORS headers
      const corsHeaders = {
        'Access-Control-Allow-Origin': response.headers.get('Access-Control-Allow-Origin'),
        'Access-Control-Allow-Methods': response.headers.get('Access-Control-Allow-Methods'),
        'Access-Control-Allow-Headers': response.headers.get('Access-Control-Allow-Headers')
      };
      
      results.tests.push({
        name: "CORS Headers",
        status: corsHeaders['Access-Control-Allow-Origin'] ? "PASS" : "FAIL",
        details: corsHeaders['Access-Control-Allow-Origin'] ? "CORS headers present" : "Missing CORS headers",
        response: corsHeaders
      });

    } catch (error) {
      results.tests.push({
        name: "Basic Connectivity",
        status: "FAIL",
        details: "Failed to connect to worker",
        response: error instanceof Error ? error.message : "Unknown error"
      });
    }

    setDiagnostics(results);
    setLoading(false);
    toast.success("Diagnostics completed");
  };

  return (
    <div className="space-y-6">
      {/* Setup Instructions */}
      <Card className="p-6 bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
        <h3 className="text-lg font-semibold mb-4 text-blue-900 dark:text-blue-100">
          🚀 Quick Setup Guide
        </h3>
        <div className="space-y-3 text-sm text-blue-800 dark:text-blue-200">
          <div className="flex items-start gap-2">
            <span className="font-bold">1.</span>
            <span>Deploy the complete Worker code to fix CORS issues (use complete-worker.js)</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="font-bold">2.</span>
            <span>Enter your Worker URL below and test the connection</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="font-bold">3.</span>
            <span>Upload videos and generate embeddable HTML code</span>
          </div>
        </div>
        
        {/* Connection Status */}
        {bucketUrl && (
          <div className="mt-4 p-3 bg-white dark:bg-gray-800 rounded-lg border">
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${
                videos.length > 0 ? 'bg-green-500' : 
                loading ? 'bg-blue-500 animate-pulse' : 
                'bg-yellow-500'
              }`}></div>
              <span className="text-sm font-medium">
                {videos.length > 0 ? `Connected (${videos.length} videos)` : 
                 loading ? 'Connecting...' : 
                 'Worker Ready - Bucket Empty'}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Worker URL: {bucketUrl}
            </p>
            {videos.length === 0 && !loading && (
              <div className="mt-2">
                <p className="text-xs text-blue-600 dark:text-blue-400">
                  💡 Upload some videos to see them here, or enable Demo Mode to test
                </p>
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="mt-2 text-xs"
                  onClick={() => {
                    const input = document.createElement('input');
                    input.type = 'file';
                    input.accept = 'video/*';
                    input.onchange = (e) => {
                      const file = e.target.files[0];
                      if (file) {
                        setUploadFile(file);
                        uploadVideo();
                      }
                    };
                    input.click();
                  }}
                >
                  <Upload className="w-3 h-3 mr-1" />
                  Quick Upload Test
                </Button>
              </div>
            )}
          </div>
        )}
      </Card>

      {/* Bucket Configuration */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Settings className="w-5 h-5" />
          Cloudflare R2 Bucket Setup
        </h3>
        
        <div className="space-y-4">
          <div>
            <Label htmlFor="bucket-url">Cloudflare Worker URL</Label>
            <Input
              id="bucket-url"
              placeholder="https://your-worker.your-subdomain.workers.dev"
              value={bucketUrl}
              onChange={(e) => setBucketUrl(e.target.value)}
              className="mt-1"
            />
            <p className="text-sm text-muted-foreground mt-1">
              Your deployed Cloudflare Worker URL that handles video operations
            </p>
          </div>
          
          <div>
            <Label htmlFor="bucket-name">Bucket Name (Optional)</Label>
            <Input
              id="bucket-name"
              placeholder="my-video-bucket"
              value={bucketName}
              onChange={(e) => setBucketName(e.target.value)}
              className="mt-1"
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Switch
                checked={testMode}
                onCheckedChange={setTestMode}
                id="test-mode"
              />
              <Label htmlFor="test-mode" className="text-sm">
                Demo Mode (Use sample videos)
              </Label>
            </div>
            
            <div className="flex gap-2">
              <Button onClick={fetchVideos} disabled={loading || (!bucketUrl && !testMode)}>
                <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                {loading ? 'Loading...' : 'Fetch Videos'}
              </Button>
              <Button 
                variant="outline" 
                onClick={runDiagnostics}
                disabled={loading || !bucketUrl}
              >
                🔍 Run Diagnostics
              </Button>
              <Button 
                variant="outline" 
                onClick={() => window.open('https://dash.cloudflare.com', '_blank')}
              >
                Open Cloudflare Dashboard
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* Diagnostic Results */}
      {diagnostics && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">🔍 Diagnostic Results</h3>
          <div className="space-y-3">
            <div className="text-sm text-muted-foreground">
              <strong>Worker URL:</strong> {diagnostics.workerUrl}
            </div>
            <div className="text-sm text-muted-foreground">
              <strong>Test Time:</strong> {new Date(diagnostics.timestamp).toLocaleString()}
            </div>
            
            {diagnostics.tests.map((test: any, index: number) => (
              <div key={index} className={`p-3 rounded-lg border ${
                test.status === 'PASS' 
                  ? 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800' 
                  : 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800'
              }`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium">{test.name}</span>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    test.status === 'PASS' 
                      ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200' 
                      : 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200'
                  }`}>
                    {test.status}
                  </span>
                </div>
                <div className="text-sm text-muted-foreground mb-2">
                  {test.details}
                </div>
                {test.response && (
                  <details className="text-xs">
                    <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                      View Response Details
                    </summary>
                    <pre className="mt-2 p-2 bg-secondary rounded text-xs overflow-x-auto">
                      {JSON.stringify(test.response, null, 2)}
                    </pre>
                  </details>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Video Upload */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Upload className="w-5 h-5" />
          Upload Videos
        </h3>
        
        <div className="space-y-4">
          <div>
            <Label htmlFor="video-upload">Select Video File</Label>
            <Input
              id="video-upload"
              type="file"
              accept="video/*"
              onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
              className="mt-1"
            />
          </div>
          
          <Button 
            onClick={uploadVideo} 
            disabled={uploading || !uploadFile || !bucketUrl}
            className="w-full"
          >
            <Upload className="w-4 h-4 mr-2" />
            {uploading ? 'Uploading...' : 'Upload Video'}
          </Button>
        </div>
      </Card>

      {/* Quick Thumbnail Upload */}
      {videos.length > 0 && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            🖼️ Quick Thumbnail Upload
          </h3>
          
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Upload thumbnails for your videos. They'll automatically appear in your exported code.
            </p>
            
            <div className="grid gap-3">
              {videos.map((video, index) => (
                <div key={index} className="flex items-center gap-3 p-3 border rounded-lg">
                  <div className="w-16 h-10 bg-gray-200 dark:bg-gray-700 rounded flex items-center justify-center">
                    {video.thumbnail ? (
                      <img 
                        src={video.thumbnail} 
                        alt="Thumbnail"
                        className="w-full h-full object-cover rounded"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                          e.currentTarget.nextElementSibling.style.display = 'flex';
                        }}
                      />
                    ) : null}
                    <div className={`w-full h-full flex items-center justify-center ${video.thumbnail ? 'hidden' : 'flex'}`}>
                      <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z"/>
                      </svg>
                    </div>
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{video.key}</p>
                    <p className="text-xs text-muted-foreground">
                      {video.thumbnail ? 'Has thumbnail' : 'No thumbnail'}
                    </p>
                  </div>
                  
                  <div className="flex gap-2">
                    <Input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      id={`thumbnail-${index}`}
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          await uploadThumbnail(file, video.key);
                        }
                      }}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        document.getElementById(`thumbnail-${index}`)?.click();
                      }}
                      disabled={uploadingThumbnail}
                    >
                      {uploadingThumbnail && selectedVideoForThumbnail === video.key ? (
                        <>
                          <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
                          Uploading...
                        </>
                      ) : (
                        <>
                          <Upload className="w-3 h-3 mr-1" />
                          {video.thumbnail ? 'Change' : 'Add'}
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}

      {/* Video Gallery */}
      {videos.length > 0 && (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-2xl font-bold flex items-center gap-2">
              🎬 Video Gallery ({videos.length})
            </h3>
            <div className="flex items-center gap-2">
              <Label htmlFor="show-thumbnails" className="text-sm font-medium">Show Thumbnails</Label>
              <Switch
                checked={showThumbnails}
                onCheckedChange={setShowThumbnails}
                id="show-thumbnails"
              />
            </div>
          </div>
          
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {videos.map((video, index) => (
              <div key={index} className="group relative bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 hover:shadow-xl transition-all duration-300 hover:scale-105 hover:border-blue-300 dark:hover:border-blue-600">
                {/* Video Preview/Thumbnail */}
                <div className="relative aspect-video bg-gray-200 dark:bg-gray-700">
                  {showThumbnails && video.thumbnail ? (
                    <img 
                      src={video.thumbnail} 
                      alt={video.key}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                        e.currentTarget.nextElementSibling.style.display = 'flex';
                      }}
                    />
                  ) : null}
                  <div className={`w-full h-full flex items-center justify-center ${showThumbnails && video.thumbnail ? 'hidden' : 'flex'}`}>
                    <div className="text-center">
                      <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-2 shadow-lg">
                        <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M8 5v10l8-5-8-5z"/>
                        </svg>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Video Preview</p>
                    </div>
                  </div>
                  
                  {/* Play Button Overlay */}
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all duration-300 flex items-center justify-center">
                    <div className="w-16 h-16 bg-white bg-opacity-95 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 shadow-xl transform scale-75 group-hover:scale-100">
                      <svg className="w-8 h-8 text-gray-800 ml-1" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M8 5v10l8-5-8-5z"/>
                      </svg>
                    </div>
                  </div>
                  
                  {/* Video Quality Badge */}
                  <div className="absolute top-3 right-3 bg-black bg-opacity-80 text-white text-xs px-2 py-1 rounded-full font-medium">
                    {video.size > 20000000 ? 'HD' : video.size > 10000000 ? 'SD+' : 'SD'}
                  </div>
                  
                  {/* Video Index */}
                  <div className="absolute top-3 left-3 bg-blue-500 text-white text-xs px-2 py-1 rounded-full font-bold">
                    #{index + 1}
                  </div>
                </div>
                
                {/* Video Info */}
                <div className="p-5">
                  <h4 className="font-semibold text-sm mb-3 line-clamp-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors leading-tight">
                    {video.key.replace(/\.[^/.]+$/, "")}
                  </h4>
                  
                  <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-4">
                    <span className="flex items-center gap-1 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-full">
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd"/>
                      </svg>
                      {(video.size / 1024 / 1024).toFixed(1)} MB
                    </span>
                    <span className="flex items-center gap-1 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-full">
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd"/>
                      </svg>
                      {new Date(video.lastModified).toLocaleDateString()}
                    </span>
                  </div>
                  
                  {/* Action Buttons */}
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 text-xs font-medium hover:bg-blue-50 hover:border-blue-300 hover:text-blue-600 dark:hover:bg-blue-900/20 dark:hover:border-blue-600 dark:hover:text-blue-400"
                      onClick={() => {
                        const videoUrl = video.url;
                        navigator.clipboard.writeText(videoUrl);
                        toast.success("Video URL copied to clipboard!");
                      }}
                    >
                      <Copy className="w-3 h-3 mr-1" />
                      Copy URL
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs font-medium hover:bg-green-50 hover:border-green-300 hover:text-green-600 dark:hover:bg-green-900/20 dark:hover:border-green-600 dark:hover:text-green-400"
                      onClick={() => window.open(video.url, '_blank')}
                    >
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z"/>
                        <path d="M5 5a2 2 0 00-2 2v6a2 2 0 002 2h6a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z"/>
                      </svg>
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Video Player Preview */}
      {videos.length > 0 && (
        <Card className="p-6">
          <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
            🎥 Video Player Preview
          </h3>
          <div className="space-y-4">
            <div className="flex gap-2 flex-wrap">
              {videos.map((video, index) => (
                <Button
                  key={index}
                  variant={index === 0 ? "default" : "outline"}
                  size="sm"
                  onClick={() => {
                    // Set the first video as default for preview
                    const videoElement = document.getElementById('preview-video') as HTMLVideoElement;
                    if (videoElement) {
                      videoElement.src = video.url;
                      videoElement.load();
                    }
                  }}
                  className="text-xs"
                >
                  Video {index + 1}
                </Button>
              ))}
            </div>
            
            <div className="relative">
              <video
                id="preview-video"
                controls
                className="w-full rounded-lg shadow-lg"
                style={{ maxHeight: '400px' }}
                preload="metadata"
                crossOrigin="anonymous"
                playsInline
                onError={(e) => {
                  console.error('Video error:', e);
                  const target = e.target as HTMLVideoElement;
                  console.error('Video error details:', {
                    error: target.error,
                    networkState: target.networkState,
                    readyState: target.readyState,
                    src: target.src
                  });
                }}
                onLoadStart={() => console.log('Video loading started')}
                onCanPlay={() => console.log('Video can play')}
              >
                <source src={videos[0]?.url} type="video/mp4" />
                <source src={videos[0]?.url} type="video/webm" />
                <source src={videos[0]?.url} type="video/ogg" />
                Your browser does not support the video tag.
              </video>
              <div className="absolute top-2 left-2 bg-black bg-opacity-70 text-white text-xs px-2 py-1 rounded">
                Preview Mode
              </div>
              <div className="absolute top-2 right-2 bg-blue-500 text-white text-xs px-2 py-1 rounded">
                <a href={videos[0]?.url} target="_blank" rel="noopener noreferrer" className="text-white hover:underline">
                  Open Direct Link
                </a>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Player Configuration */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Player Customization</h3>
        
        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <Label>Width: {config.width}px</Label>
              <Slider
                value={[config.width]}
                onValueChange={(value) => setConfig({...config, width: value[0]})}
                min={300}
                max={1200}
                step={50}
                className="mt-2"
              />
            </div>
            
            <div>
              <Label>Height: {config.height}px</Label>
              <Slider
                value={[config.height]}
                onValueChange={(value) => setConfig({...config, height: value[0]})}
                min={200}
                max={800}
                step={25}
                className="mt-2"
              />
            </div>
            
            <div>
              <Label>Border Radius: {config.borderRadius}px</Label>
              <Slider
                value={[config.borderRadius]}
                onValueChange={(value) => setConfig({...config, borderRadius: value[0]})}
                min={0}
                max={30}
                step={2}
                className="mt-2"
              />
            </div>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Autoplay</Label>
              <Switch
                checked={config.autoplay}
                onCheckedChange={(checked) => setConfig({...config, autoplay: checked})}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <Label>Muted</Label>
              <Switch
                checked={config.muted}
                onCheckedChange={(checked) => setConfig({...config, muted: checked})}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <Label>Loop</Label>
              <Switch
                checked={config.loop}
                onCheckedChange={(checked) => setConfig({...config, loop: checked})}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <Label>Show Controls</Label>
              <Switch
                checked={config.controls}
                onCheckedChange={(checked) => setConfig({...config, controls: checked})}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <Label>Show Counter</Label>
              <Switch
                checked={config.showCounter}
                onCheckedChange={(checked) => setConfig({...config, showCounter: checked})}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <Label>Show Navigation Arrows</Label>
              <Switch
                checked={config.showArrows}
                onCheckedChange={(checked) => setConfig({...config, showArrows: checked})}
              />
            </div>
            
            <div>
              <Label>Theme</Label>
              <Select
                value={config.theme}
                onValueChange={(value: 'dark' | 'light') => setConfig({...config, theme: value})}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="dark">Dark</SelectItem>
                  <SelectItem value="light">Light</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </Card>

      {/* Code Generation */}
      {videos.length > 0 && (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Generated HTML Code</h3>
            <div className="flex gap-2">
              <Button onClick={copyToClipboard} variant="outline" size="sm">
                {copied ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
                {copied ? 'Copied!' : 'Copy Code'}
              </Button>
              <Button onClick={downloadCode} variant="outline" size="sm">
                <Download className="w-4 h-4 mr-2" />
                Download
              </Button>
            </div>
          </div>
          
          <Textarea
            value={generateCodeSnippet()}
            readOnly
            className="min-h-[300px] font-mono text-sm"
            placeholder="Generated code will appear here..."
          />
        </Card>
      )}
    </div>
  );
};

export default BucketManager;
