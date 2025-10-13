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
  const [bucketUrl, setBucketUrl] = useState("");
  const [bucketName, setBucketName] = useState("");
  const [videos, setVideos] = useState<VideoFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
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
        toast.success("Demo mode: Loaded 2 sample videos with thumbnails");
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
      const response = await fetch(`${bucketUrl}/list-videos`);
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

  // Generate HTML code snippet
  const generateCodeSnippet = () => {
    const videoUrls = videos.map(v => v.url);
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
    ${config.showCounter ? `<div class="video-counter" id="counter">1 / ${videoUrls.length}</div>` : ''}
    
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
    
    ${config.showArrows && videoUrls.length > 1 ? `
      <button class="nav-arrow prev" id="prev-btn" onclick="previousVideo()">‹</button>
      <button class="nav-arrow next" id="next-btn" onclick="nextVideo()">›</button>
    ` : ''}
  </div>
  
  <script>
    const videos = ${JSON.stringify(videoUrls)};
    let currentIndex = 0;
    const videoElement = document.getElementById('current-video');
    const counterElement = document.getElementById('counter');
    const prevBtn = document.getElementById('prev-btn');
    const nextBtn = document.getElementById('next-btn');
    
    function loadVideo(index) {
      if (index >= 0 && index < videos.length) {
        currentIndex = index;
        videoElement.src = videos[index];
        if (counterElement) {
          counterElement.textContent = \`\${index + 1} / \${videos.length}\`;
        }
        if (prevBtn) prevBtn.disabled = index === 0;
        if (nextBtn) nextBtn.disabled = index === videos.length - 1;
      }
    }
    
    function nextVideo() {
      if (currentIndex < videos.length - 1) {
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

      {/* Video List */}
      {videos.length > 0 && (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Videos in Bucket ({videos.length})</h3>
            <div className="flex items-center gap-2">
              <Switch
                checked={showThumbnails}
                onCheckedChange={setShowThumbnails}
                id="show-thumbnails"
              />
              <Label htmlFor="show-thumbnails" className="text-sm">
                Show Thumbnails
              </Label>
            </div>
          </div>
          
          <div className="space-y-3 max-h-80 overflow-y-auto">
            {videos.map((video, index) => (
              <div key={index} className="flex items-center gap-4 p-4 bg-secondary rounded-lg border border-border/50">
                {showThumbnails && video.thumbnail && (
                  <div className="w-20 h-12 bg-muted rounded overflow-hidden flex-shrink-0">
                    <img 
                      src={video.thumbnail} 
                      alt={video.key}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  </div>
                )}
                
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{video.key}</p>
                  <p className="text-xs text-muted-foreground">
                    {(video.size / 1024 / 1024).toFixed(2)} MB • {new Date(video.lastModified).toLocaleDateString()}
                  </p>
                </div>
                
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => window.open(video.url, '_blank')}
                  >
                    Preview
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      navigator.clipboard.writeText(video.url);
                      toast.success("Video URL copied to clipboard");
                    }}
                  >
                    Copy URL
                  </Button>
                </div>
              </div>
            ))}
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
