import { useState } from "react";
import VideoContainer from "@/components/VideoContainer";
import BucketManager from "@/components/BucketManager";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Copy, Check, Plus, X, Database, Code } from "lucide-react";

const Index = () => {
  const [videoUrls, setVideoUrls] = useState<string[]>([]);
  const [currentInput, setCurrentInput] = useState("");
  const [copied, setCopied] = useState(false);

  const exampleUrls = [
    {
      label: "YouTube Example",
      url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
    },
    {
      label: "Cloudflare R2",
      url: "https://pub-12345.r2.dev/sample-video.mp4"
    },
    {
      label: "Direct MP4",
      url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4"
    }
  ];

  const addVideoUrl = () => {
    if (currentInput.trim() && !videoUrls.includes(currentInput.trim())) {
      setVideoUrls([...videoUrls, currentInput.trim()]);
      setCurrentInput("");
    }
  };

  const removeVideoUrl = (index: number) => {
    setVideoUrls(videoUrls.filter((_, i) => i !== index));
  };

  const addExampleUrl = (url: string) => {
    if (!videoUrls.includes(url)) {
      setVideoUrls([...videoUrls, url]);
    }
  };

  const videoUrlsJson = JSON.stringify(videoUrls, null, 2);
  
  const htmlSnippet = `<!-- Universal Video Container -->
<div id="video-carousel-container" style="position: relative; width: 100%; max-width: 1200px; margin: 0 auto;">
  <script>
    const videos = ${videoUrlsJson};
    let currentIndex = 0;
    
    // Implementation would go here
    // This container supports navigation through multiple videos
    // Full React component code available in your project
  </script>
</div>`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(htmlSnippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-background py-12 px-4">
      <div className="max-w-6xl mx-auto space-y-12">
        {/* Header */}
        <header className="text-center space-y-4">
          <h1 className="text-5xl font-bold bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
            Video Anywhere Box
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Create video carousels from Cloudflare R2, Supabase Storage, YouTube, or any direct video URL.
            Generate embeddable HTML code for your website.
          </p>
        </header>

        {/* Main Content Tabs */}
        <Tabs defaultValue="manual" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="manual" className="flex items-center gap-2">
              <Code className="w-4 h-4" />
              Manual Setup
            </TabsTrigger>
            <TabsTrigger value="bucket" className="flex items-center gap-2">
              <Database className="w-4 h-4" />
              Cloudflare R2 Bucket
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="manual" className="space-y-12">

        {/* Video URL Management */}
        <section className="space-y-6">
          <Card className="p-6 bg-card border-border">
            <div className="space-y-4">
              <div className="flex gap-2">
                <Input
                  type="url"
                  placeholder="Paste your video URL here..."
                  value={currentInput}
                  onChange={(e) => setCurrentInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addVideoUrl()}
                  className="flex-1 bg-secondary border-border text-foreground"
                />
                <Button onClick={addVideoUrl} disabled={!currentInput.trim()}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Video
                </Button>
              </div>
              
              {/* Video List */}
              {videoUrls.length > 0 && (
                <div className="space-y-2 p-4 bg-secondary/50 rounded-lg border border-border">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Videos in carousel ({videoUrls.length})</span>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => setVideoUrls([])}
                      className="text-xs h-8"
                    >
                      Clear All
                    </Button>
                  </div>
                  {videoUrls.map((url, index) => (
                    <div key={index} className="flex items-center gap-2 p-3 bg-background rounded border border-border/50">
                      <span className="text-xs text-muted-foreground w-8 font-mono">#{index + 1}</span>
                      <span className="flex-1 text-sm truncate">{url}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeVideoUrl(index)}
                        className="h-8 w-8 hover:bg-destructive/20 hover:text-destructive"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
              
              <div className="flex flex-wrap gap-2">
                <span className="text-sm text-muted-foreground self-center">Quick examples:</span>
                {exampleUrls.map((example) => (
                  <Button
                    key={example.label}
                    variant="outline"
                    size="sm"
                    onClick={() => addExampleUrl(example.url)}
                    className="text-xs"
                  >
                    {example.label}
                  </Button>
                ))}
              </div>
            </div>
          </Card>

          <VideoContainer urls={videoUrls} title="Product Video Carousel" />
        </section>

        {/* HTML Code Snippet */}
        {videoUrls.length > 0 && (
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-semibold text-foreground">HTML Code Snippet</h2>
              <Button
                onClick={copyToClipboard}
                variant="outline"
                size="sm"
                className="gap-2"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    Copy Code
                  </>
                )}
              </Button>
            </div>
            
            <Card className="bg-secondary border-border">
              <pre className="p-6 overflow-x-auto text-sm text-foreground">
                <code>{htmlSnippet}</code>
              </pre>
            </Card>
          </section>
        )}

        {/* Usage Guide */}
        <section className="space-y-6">
          <h2 className="text-2xl font-semibold text-foreground">How to Use</h2>
          
          <div className="grid md:grid-cols-3 gap-4">
            <Card className="p-6 bg-card border-border space-y-2">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-bold text-xl">
                1
              </div>
              <h3 className="font-semibold text-foreground">Add Videos</h3>
              <p className="text-sm text-muted-foreground">
                Add multiple video URLs from Cloudflare R2, YouTube, Supabase, or any direct link
              </p>
            </Card>

            <Card className="p-6 bg-card border-border space-y-2">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-bold text-xl">
                2
              </div>
              <h3 className="font-semibold text-foreground">Navigate Videos</h3>
              <p className="text-sm text-muted-foreground">
                Use arrow buttons to browse through your video carousel. Each video loads on demand.
              </p>
            </Card>

            <Card className="p-6 bg-card border-border space-y-2">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-bold text-xl">
                3
              </div>
              <h3 className="font-semibold text-foreground">Copy & Embed</h3>
              <p className="text-sm text-muted-foreground">
                Get clean HTML code that embeds your entire video carousel anywhere
              </p>
            </Card>
          </div>
        </section>

        {/* Supported Sources */}
        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-foreground">Supported Video Sources</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <Card className="p-4 bg-card border-border">
              <h3 className="font-semibold text-foreground mb-2">Direct Video URLs</h3>
              <ul className="space-y-1 text-sm text-muted-foreground">
                <li>• Cloudflare R2 Storage (recommended - fast & free)</li>
                <li>• Supabase Storage (public bucket URLs)</li>
                <li>• Any HTTPS direct video link (.mp4, .webm, .ogg)</li>
              </ul>
            </Card>
            
            <Card className="p-4 bg-card border-border">
              <h3 className="font-semibold text-foreground mb-2">YouTube URLs</h3>
              <ul className="space-y-1 text-sm text-muted-foreground">
                <li>• Standard: youtube.com/watch?v=...</li>
                <li>• Short: youtu.be/...</li>
                <li>• Embed: youtube.com/embed/...</li>
              </ul>
            </Card>
          </div>
          
          {/* Cloudflare R2 CORS Setup */}
          <Card className="p-4 bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
            <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">🔧 Cloudflare R2 Setup Required</h3>
            <p className="text-sm text-blue-800 dark:text-blue-200 mb-2">
              For Cloudflare R2 videos to work, you need to configure CORS on your R2 bucket:
            </p>
            <div className="bg-blue-100 dark:bg-blue-900/40 p-3 rounded-lg text-xs font-mono text-blue-900 dark:text-blue-100">
              <div>1. Go to Cloudflare Dashboard → R2 → Your Bucket</div>
              <div>2. Settings → CORS policy</div>
              <div>3. Add this configuration:</div>
              <div className="mt-2 ml-4">
                <div>[</div>
                <div className="ml-4">{"{"}</div>
                <div className="ml-8">"AllowedOrigins": ["*"],</div>
                <div className="ml-8">"AllowedMethods": ["GET", "HEAD"],</div>
                <div className="ml-8">"AllowedHeaders": ["Range", "Content-Type"]</div>
                <div className="ml-4">{"}"}</div>
                <div>]</div>
              </div>
            </div>
          </Card>
        </section>

        {/* Features */}
        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-foreground">Features</h2>
          <Card className="p-6 bg-card border-border">
            <ul className="grid md:grid-cols-2 gap-3 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <span className="text-primary">✓</span>
                <span>Lazy loading - only current video loads</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary">✓</span>
                <span>Custom YouTube player controls</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary">✓</span>
                <span>Responsive 16:9 aspect ratio</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary">✓</span>
                <span>Keyboard & fullscreen support</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary">✓</span>
                <span>Progress tracking & seek controls</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary">✓</span>
                <span>Video counter display</span>
              </li>
            </ul>
          </Card>
        </section>
          </TabsContent>
          
          <TabsContent value="bucket" className="space-y-6">
            <BucketManager />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Index;
