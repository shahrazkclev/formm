import { useState, useEffect, useRef } from "react";
import { Play, Pause, Volume2, VolumeX, Maximize, AlertCircle, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "./ui/button";
import { Slider } from "./ui/slider";

interface VideoContainerProps {
  urls: string[];
  title?: string;
  className?: string;
}

const VideoContainer = ({ urls, title = "Video Player", className = "" }: VideoContainerProps) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const url = urls[currentIndex] || "";
  
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(100);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const playerRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const intervalRef = useRef<number | null>(null);

  // Detect if URL is a YouTube video
  const isYouTube = (url: string) => {
    return url.includes('youtube.com') || url.includes('youtu.be');
  };

  // Convert YouTube URL to embed format
  const getYouTubeEmbedUrl = (url: string) => {
    let videoId = '';
    
    if (url.includes('youtube.com/watch?v=')) {
      videoId = url.split('v=')[1]?.split('&')[0] || '';
    } else if (url.includes('youtu.be/')) {
      videoId = url.split('youtu.be/')[1]?.split('?')[0] || '';
    } else if (url.includes('youtube.com/embed/')) {
      return url;
    }
    
    return `https://www.youtube.com/embed/${videoId}`;
  };

  const handleLoad = () => {
    setIsLoading(false);
  };

  const handleError = (event?: React.SyntheticEvent<HTMLVideoElement, Event>) => {
    setIsLoading(false);
    setHasError(true);
    
    // Check if this is a Cloudflare R2 URL
    const isR2Url = url.includes('r2.dev') || url.includes('cloudflare');
    
    // Try to get more specific error information
    const video = event?.currentTarget;
    if (video) {
      const error = video.error;
      if (error) {
        switch (error.code) {
          case 1: // MEDIA_ERR_ABORTED
            setErrorMessage(isR2Url ? 
              "Video loading was aborted. This is likely a CORS issue with Cloudflare R2." : 
              "Video loading was aborted.");
            break;
          case 2: // MEDIA_ERR_NETWORK
            setErrorMessage(isR2Url ? 
              "Network error occurred while loading video. Check your internet connection and CORS settings for Cloudflare R2." : 
              "Network error occurred while loading video. Check your internet connection.");
            break;
          case 3: // MEDIA_ERR_DECODE
            setErrorMessage("Video format not supported or corrupted.");
            break;
          case 4: // MEDIA_ERR_SRC_NOT_SUPPORTED
            setErrorMessage(isR2Url ? 
              "Video source not supported. This is likely a CORS issue with Cloudflare R2." : 
              "Video source not supported. Check the URL and file format.");
            break;
          default:
            setErrorMessage(isR2Url ? 
              "Unknown error occurred while loading video. This might be a CORS issue with Cloudflare R2." : 
              "Unknown error occurred while loading video.");
        }
      } else {
        setErrorMessage(isR2Url ? 
          "Failed to load video. This is likely a CORS issue with Cloudflare R2." : 
          "Failed to load video. Please check the URL.");
      }
    } else {
      setErrorMessage(isR2Url ? 
        "Failed to load video. This is likely a CORS issue with Cloudflare R2." : 
        "Failed to load video. Please check the URL.");
    }
  };

  // Load YouTube IFrame API
  useEffect(() => {
    if (!isYouTube(url)) return;

    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    const firstScriptTag = document.getElementsByTagName('script')[0];
    firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);

    (window as any).onYouTubeIframeAPIReady = () => {
      if (playerRef.current) return;
      
      const videoId = getYouTubeVideoId(url);
      playerRef.current = new (window as any).YT.Player('youtube-player', {
        videoId,
        playerVars: {
          controls: 0,
          modestbranding: 1,
          rel: 0,
          showinfo: 0,
          fs: 0,
          iv_load_policy: 3,
          disablekb: 1,
          playsinline: 1,
        },
        events: {
          onReady: (event: any) => {
            setIsLoading(false);
            setDuration(event.target.getDuration());
          },
          onStateChange: (event: any) => {
            if (event.data === (window as any).YT.PlayerState.PLAYING) {
              setIsPlaying(true);
              startProgressTracking();
            } else {
              setIsPlaying(false);
              stopProgressTracking();
            }
          },
          onError: () => {
            handleError();
          }
        }
      });
    };
  }, [currentIndex, url]);

  // Reset state when video changes
  useEffect(() => {
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    setIsLoading(true);
    setHasError(false);
    setErrorMessage("");
    
    if (playerRef.current) {
      playerRef.current.destroy();
      playerRef.current = null;
    }
  }, [currentIndex]);

  const getYouTubeVideoId = (url: string) => {
    if (url.includes('youtube.com/watch?v=')) {
      return url.split('v=')[1]?.split('&')[0] || '';
    } else if (url.includes('youtu.be/')) {
      return url.split('youtu.be/')[1]?.split('?')[0] || '';
    } else if (url.includes('youtube.com/embed/')) {
      return url.split('embed/')[1]?.split('?')[0] || '';
    }
    return '';
  };

  const startProgressTracking = () => {
    if (intervalRef.current) return;
    intervalRef.current = window.setInterval(() => {
      if (playerRef.current) {
        setCurrentTime(playerRef.current.getCurrentTime());
      }
    }, 100);
  };

  const stopProgressTracking = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  useEffect(() => {
    return () => stopProgressTracking();
  }, []);

  const togglePlay = () => {
    if (!playerRef.current) return;
    if (isPlaying) {
      playerRef.current.pauseVideo();
    } else {
      playerRef.current.playVideo();
    }
  };

  const toggleMute = () => {
    if (!playerRef.current) return;
    if (isMuted) {
      playerRef.current.unMute();
      setIsMuted(false);
    } else {
      playerRef.current.mute();
      setIsMuted(true);
    }
  };

  const handleVolumeChange = (value: number[]) => {
    if (!playerRef.current) return;
    const newVolume = value[0];
    setVolume(newVolume);
    playerRef.current.setVolume(newVolume);
    if (newVolume === 0) {
      setIsMuted(true);
    } else if (isMuted) {
      setIsMuted(false);
    }
  };

  const handleSeek = (value: number[]) => {
    if (!playerRef.current) return;
    const newTime = value[0];
    playerRef.current.seekTo(newTime, true);
    setCurrentTime(newTime);
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const goToNext = () => {
    if (currentIndex < urls.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const goToPrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  if (!urls.length || !url) {
    return (
      <div className={`relative w-full aspect-video rounded-xl bg-secondary border border-border flex items-center justify-center ${className}`}>
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-2" />
          <p className="text-muted-foreground">Add video URLs to start</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full">
      {/* Video counter */}
      {urls.length > 1 && (
        <div className="absolute top-4 right-4 z-30 bg-black/70 backdrop-blur-sm px-3 py-1 rounded-full text-sm text-white/90 border border-white/10">
          {currentIndex + 1} / {urls.length}
        </div>
      )}

      <div 
        ref={containerRef}
        className={`relative w-full aspect-video rounded-xl overflow-hidden bg-card border border-border shadow-2xl group ${className}`}
        style={{ boxShadow: 'var(--video-shadow)' }}
      >
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-secondary/80 backdrop-blur-sm z-10 animate-pulse">
            <Play className="w-16 h-16 text-primary animate-pulse" />
          </div>
        )}
        
        {hasError && (
          <div className="absolute inset-0 flex items-center justify-center bg-secondary z-10">
            <div className="text-center max-w-md px-4">
              <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-2" />
              <p className="text-foreground font-medium">Failed to load video</p>
              <p className="text-sm text-muted-foreground mt-1">{errorMessage}</p>
              {(errorMessage.includes("CORS") || errorMessage.includes("R2")) && (
                <div className="mt-3 p-3 bg-yellow-100 dark:bg-yellow-900/20 rounded-lg border border-yellow-300 dark:border-yellow-700">
                  <p className="text-xs text-yellow-800 dark:text-yellow-200">
                    <strong>Cloudflare R2 Fix:</strong> Configure CORS on your R2 bucket to allow your domain.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {isYouTube(url) ? (
          <>
            <div id="youtube-player" className="w-full h-full pointer-events-none" />
            
            {/* Clickable overlay to capture clicks */}
            <div 
              className="absolute inset-0 z-10"
              onClick={togglePlay}
            />
            
            {/* Custom Controls Overlay */}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent p-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-20 pointer-events-auto">
              {/* Progress Bar */}
              <div className="mb-3">
                <Slider
                  value={[currentTime]}
                  max={duration}
                  step={0.1}
                  onValueChange={handleSeek}
                  className="cursor-pointer"
                />
                <div className="flex justify-between text-xs text-white/80 mt-1">
                  <span>{formatTime(currentTime)}</span>
                  <span>{formatTime(duration)}</span>
                </div>
              </div>

              {/* Control Buttons */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={togglePlay}
                    className="text-white hover:bg-white/20 hover:text-white"
                  >
                    {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                  </Button>

                  <div className="flex items-center gap-2">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={toggleMute}
                      className="text-white hover:bg-white/20 hover:text-white"
                    >
                      {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                    </Button>
                    <div className="w-24">
                      <Slider
                        value={[volume]}
                        max={100}
                        step={1}
                        onValueChange={handleVolumeChange}
                        className="cursor-pointer"
                      />
                    </div>
                  </div>
                </div>

                <Button
                  size="icon"
                  variant="ghost"
                  onClick={toggleFullscreen}
                  className="text-white hover:bg-white/20 hover:text-white"
                >
                  <Maximize className="w-5 h-5" />
                </Button>
              </div>
            </div>
          </>
        ) : (
          <video
            key={url}
            src={url}
            controls
            crossOrigin="anonymous"
            preload="metadata"
            onLoadedData={handleLoad}
            onError={handleError}
            onLoadStart={() => setIsLoading(true)}
            onCanPlay={() => setIsLoading(false)}
            className="w-full h-full object-contain bg-black"
            title={title}
            playsInline
          >
            Your browser does not support the video tag.
          </video>
        )}
      </div>

      {/* Navigation arrows */}
      {urls.length > 1 && (
        <>
          <Button
            variant="ghost"
            size="icon"
            onClick={goToPrevious}
            disabled={currentIndex === 0}
            className="absolute left-4 top-1/2 -translate-y-1/2 z-30 bg-black/70 backdrop-blur-sm hover:bg-black/90 border border-white/10 disabled:opacity-30 disabled:cursor-not-allowed text-white"
          >
            <ChevronLeft className="h-6 w-6" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={goToNext}
            disabled={currentIndex === urls.length - 1}
            className="absolute right-4 top-1/2 -translate-y-1/2 z-30 bg-black/70 backdrop-blur-sm hover:bg-black/90 border border-white/10 disabled:opacity-30 disabled:cursor-not-allowed text-white"
          >
            <ChevronRight className="h-6 w-6" />
          </Button>
        </>
      )}
    </div>
  );
};

export default VideoContainer;
