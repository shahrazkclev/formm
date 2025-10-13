import BucketManager from "@/components/BucketManager";

const Index = () => {

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

        {/* Main Content */}
        <BucketManager />
      </div>
    </div>
  );
};

export default Index;
