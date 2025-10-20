import { useState, useEffect, useRef, useCallback, useMemo, memo } from "react";
import { Play, Pause, Volume2, VolumeX, Maximize, AlertCircle, ChevronLeft, ChevronRight, SkipBack, SkipForward, RotateCcw, Settings } from "lucide-react";
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
  const [playbackRate, setPlaybackRate] = useState(1);
  const [showControls, setShowControls] = useState(true);
  const [isNavigating, setIsNavigating] = useState(false);
  const [slideDirection, setSlideDirection] = useState<'left' | 'right' | null>(null);
  const playerRef = useRef<any>(null);
  const preloadRef = useRef<HTMLVideoElement | null>(null);
  const preloadRef2 = useRef<HTMLVideoElement | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const intervalRef = useRef<number | null>(null);
  const hideControlsTimeout = useRef<number | null>(null);
  const navigationTimeoutRef = useRef<number | null>(null);
  const animationTimeoutRef = useRef<number | null>(null);

  // Memoize YouTube detection to prevent recalculation
  const isYouTube = useCallback((url: string) => {
    return url.includes('youtube.com') || url.includes('youtu.be');
  }, []);

  // Memoize YouTube URL conversion
  const getYouTubeEmbedUrl = useCallback((url: string) => {
    let videoId = '';
    
    if (url.includes('youtube.com/watch?v=')) {
      videoId = url.split('v=')[1]?.split('&')[0] || '';
    } else if (url.includes('youtu.be/')) {
      videoId = url.split('youtu.be/')[1]?.split('?')[0] || '';
    } else if (url.includes('youtube.com/embed/')) {
      return url;
    }
    
    return `https://www.youtube.com/embed/${videoId}`;
  }, []);

  const handleLoad = useCallback(() => {
    setIsLoading(false);
  }, []);

  const handleError = useCallback((event?: React.SyntheticEvent<HTMLVideoElement, Event>) => {
    setIsLoading(false);
    setHasError(true);
    
    // Check if this is a Cloudflare R2 URL or external URL
    const isR2Url = url.includes('r2.dev') || url.includes('cloudflare');
    const isExternalUrl = !url.startsWith(window.location.origin);
    
    // Try to get more specific error information
    const video = event?.currentTarget;
    if (video) {
      const error = video.error;
      if (error) {
        switch (error.code) {
          case 1: // MEDIA_ERR_ABORTED
            setErrorMessage(isR2Url || isExternalUrl ? 
              "Video loading was aborted. This is likely a CORS issue. Try removing crossOrigin attribute or configure CORS on your server." : 
              "Video loading was aborted.");
            break;
          case 2: // MEDIA_ERR_NETWORK
            setErrorMessage(isR2Url || isExternalUrl ? 
              "Network error occurred while loading video. This is likely a CORS issue. Check your server's CORS configuration." : 
              "Network error occurred while loading video. Check your internet connection.");
            break;
          case 3: // MEDIA_ERR_DECODE
            setErrorMessage("Video format not supported or corrupted.");
            break;
          case 4: // MEDIA_ERR_SRC_NOT_SUPPORTED
            setErrorMessage(isR2Url || isExternalUrl ? 
              "Video source not supported. This is likely a CORS issue. Configure CORS headers on your server to allow video access." : 
              "Video source not supported. Check the URL and file format.");
            break;
          default:
            setErrorMessage(isR2Url || isExternalUrl ? 
              "Unknown error occurred while loading video. This might be a CORS issue. Check your server's CORS configuration." : 
              "Unknown error occurred while loading video.");
        }
      } else {
        setErrorMessage(isR2Url || isExternalUrl ? 
          "Failed to load video. This is likely a CORS issue. Configure CORS headers on your server." : 
          "Failed to load video. Please check the URL.");
      }
    } else {
      setErrorMessage(isR2Url || isExternalUrl ? 
        "Failed to load video. This is likely a CORS issue. Configure CORS headers on your server." : 
        "Failed to load video. Please check the URL.");
    }
  }, [url]);

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
    
    // Instant navigation feedback - no delay
    setIsNavigating(false);
    
    if (playerRef.current && isYouTube(url)) {
      playerRef.current.destroy();
      playerRef.current = null;
    }
    
    return () => {
      if (navigationTimeoutRef.current) {
        clearTimeout(navigationTimeoutRef.current);
      }
      if (animationTimeoutRef.current) {
        clearTimeout(animationTimeoutRef.current);
      }
    };
  }, [currentIndex, url, isYouTube]);

  // Preload next 2 videos for smoother navigation
  useEffect(() => {
    const preloadVideos = () => {
      const nextIndex = currentIndex + 1;
      const nextNextIndex = currentIndex + 2;
      
      // Preload next video
      if (nextIndex < urls.length && !isYouTube(urls[nextIndex])) {
        if (preloadRef.current) {
          preloadRef.current.src = urls[nextIndex];
          preloadRef.current.load();
        }
      }
      
      // Preload video after next
      if (nextNextIndex < urls.length && !isYouTube(urls[nextNextIndex])) {
        if (preloadRef2.current) {
          preloadRef2.current.src = urls[nextNextIndex];
          preloadRef2.current.load();
        }
      }
    };
    
    preloadVideos();
  }, [currentIndex, urls, isYouTube]);

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

  const startProgressTracking = useCallback(() => {
    if (intervalRef.current) return;
    // Reduced frequency to 250ms for better performance
    intervalRef.current = window.setInterval(() => {
      if (playerRef.current) {
        setCurrentTime(playerRef.current.getCurrentTime());
      }
    }, 250);
  }, []);

  const stopProgressTracking = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => stopProgressTracking();
  }, [stopProgressTracking]);

  const togglePlay = useCallback(() => {
    if (!playerRef.current) return;
    if (isPlaying) {
      playerRef.current.pauseVideo();
    } else {
      playerRef.current.playVideo();
    }
  }, [isPlaying]);

  const toggleMute = useCallback(() => {
    if (!playerRef.current) return;
    if (isMuted) {
      playerRef.current.unMute();
      setIsMuted(false);
    } else {
      playerRef.current.mute();
      setIsMuted(true);
    }
  }, [isMuted]);

  const handleVolumeChange = useCallback((value: number[]) => {
    if (!playerRef.current) return;
    const newVolume = value[0];
    setVolume(newVolume);
    playerRef.current.setVolume(newVolume);
    if (newVolume === 0) {
      setIsMuted(true);
    } else if (isMuted) {
      setIsMuted(false);
    }
  }, [isMuted]);

  const handleSeek = useCallback((value: number[]) => {
    if (!playerRef.current) return;
    const newTime = value[0];
    playerRef.current.seekTo(newTime, true);
    setCurrentTime(newTime);
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  }, []);

  const formatTime = useCallback((seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }, []);

  const goToNext = useCallback(() => {
    if (isNavigating || currentIndex >= urls.length - 1) return;
    
    // Set navigating and slide direction INSTANTLY
    setIsNavigating(true);
    setSlideDirection('left');
    
    // Stop current video
    if (playerRef.current && !isYouTube(url)) {
      playerRef.current.pause();
      playerRef.current.currentTime = 0;
    }
    
    // Change index immediately with no delay for instant response
    setCurrentIndex(prev => prev + 1);
    
    // Clear slide animation after CSS transition completes
    if (animationTimeoutRef.current) {
      clearTimeout(animationTimeoutRef.current);
    }
    animationTimeoutRef.current = window.setTimeout(() => {
      setSlideDirection(null);
    }, 400);
  }, [isNavigating, currentIndex, urls.length, url, isYouTube]);

  const goToPrevious = useCallback(() => {
    if (isNavigating || currentIndex <= 0) return;
    
    // Set navigating and slide direction INSTANTLY
    setIsNavigating(true);
    setSlideDirection('right');
    
    // Stop current video
    if (playerRef.current && !isYouTube(url)) {
      playerRef.current.pause();
      playerRef.current.currentTime = 0;
    }
    
    // Change index immediately with no delay for instant response
    setCurrentIndex(prev => prev - 1);
    
    // Clear slide animation after CSS transition completes
    if (animationTimeoutRef.current) {
      clearTimeout(animationTimeoutRef.current);
    }
    animationTimeoutRef.current = window.setTimeout(() => {
      setSlideDirection(null);
    }, 400);
  }, [isNavigating, currentIndex, url, isYouTube]);

  const skipBackward = useCallback(() => {
    if (!playerRef.current) return;
    const newTime = Math.max(0, currentTime - 10);
    playerRef.current.seekTo(newTime, true);
    setCurrentTime(newTime);
  }, [currentTime]);

  const skipForward = useCallback(() => {
    if (!playerRef.current) return;
    const newTime = Math.min(duration, currentTime + 10);
    playerRef.current.seekTo(newTime, true);
    setCurrentTime(newTime);
  }, [duration, currentTime]);

  const handlePlaybackRateChange = useCallback((rate: number) => {
    if (!playerRef.current) return;
    setPlaybackRate(rate);
    playerRef.current.setPlaybackRate(rate);
  }, []);

  const resetVideo = useCallback(() => {
    if (!playerRef.current) return;
    playerRef.current.seekTo(0, true);
    setCurrentTime(0);
  }, []);

  const handleMouseMove = useCallback(() => {
    setShowControls(true);
    if (hideControlsTimeout.current) {
      clearTimeout(hideControlsTimeout.current);
    }
    hideControlsTimeout.current = window.setTimeout(() => {
      setShowControls(false);
    }, 3000);
  }, []);

  const handleMouseLeave = useCallback(() => {
    if (hideControlsTimeout.current) {
      clearTimeout(hideControlsTimeout.current);
    }
    hideControlsTimeout.current = window.setTimeout(() => {
      setShowControls(false);
    }, 1000);
  }, []);

  // Optimized video event handlers
  const handleLoadStart = useCallback(() => setIsLoading(true), []);
  const handleCanPlay = useCallback(() => setIsLoading(false), []);
  const handleTimeUpdate = useCallback((e: React.SyntheticEvent<HTMLVideoElement>) => {
    setCurrentTime(e.currentTarget.currentTime);
  }, []);
  const handleLoadedMetadata = useCallback((e: React.SyntheticEvent<HTMLVideoElement>) => {
    setDuration(e.currentTarget.duration);
  }, []);
  const handlePlay = useCallback(() => setIsPlaying(true), []);
  const handlePause = useCallback(() => setIsPlaying(false), []);
  const handleVolumeChangeEvent = useCallback((e: React.SyntheticEvent<HTMLVideoElement>) => {
    setVolume(e.currentTarget.volume * 100);
    setIsMuted(e.currentTarget.muted);
  }, []);

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
        className={`relative w-full aspect-video rounded-xl overflow-hidden bg-card border border-border shadow-2xl group ${className} ${
          slideDirection === 'left' ? 'animate-slide-left' : 
          slideDirection === 'right' ? 'animate-slide-right' : 
          'animate-fade-in'
        }`}
        style={{ 
          boxShadow: 'var(--video-shadow)',
        }}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-secondary/90 to-secondary/70 backdrop-blur-sm z-10">
            <div className="relative">
              {/* Skeleton loader with pulsing animation */}
              <div className="w-24 h-24 rounded-full bg-primary/20 animate-pulse flex items-center justify-center">
                <div className="w-16 h-16 rounded-full bg-primary/30 animate-pulse flex items-center justify-center">
                  <Play className="w-8 h-8 text-primary animate-pulse" />
                </div>
              </div>
              {/* Loading text */}
              <p className="text-center mt-4 text-sm text-muted-foreground animate-pulse">
                Loading video...
              </p>
            </div>
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
                  <p className="text-xs text-yellow-800 dark:text-yellow-200 mb-2">
                    <strong>CORS Fix Options:</strong>
                  </p>
                  <ul className="text-xs text-yellow-800 dark:text-yellow-200 space-y-1">
                    <li>• Configure CORS headers on your server</li>
                    <li>• For Cloudflare R2: Add CORS rules in bucket settings</li>
                    <li>• Try using a proxy server</li>
                    <li>• Use same-origin video URLs when possible</li>
                  </ul>
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
            <div className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent p-4 transition-opacity duration-300 z-20 pointer-events-auto ${showControls ? 'opacity-100' : 'opacity-0'}`}>
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

                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={skipBackward}
                    className="text-white hover:bg-white/20 hover:text-white"
                    title="Skip back 10s"
                  >
                    <SkipBack className="w-4 h-4" />
                  </Button>

                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={skipForward}
                    className="text-white hover:bg-white/20 hover:text-white"
                    title="Skip forward 10s"
                  >
                    <SkipForward className="w-4 h-4" />
                  </Button>

                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={resetVideo}
                    className="text-white hover:bg-white/20 hover:text-white"
                    title="Reset to beginning"
                  >
                    <RotateCcw className="w-4 h-4" />
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

                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1">
                    <span className="text-white/80 text-sm">Speed:</span>
                    <select
                      value={playbackRate}
                      onChange={(e) => handlePlaybackRateChange(parseFloat(e.target.value))}
                      className="bg-black/50 text-white text-sm rounded px-2 py-1 border border-white/20"
                    >
                      <option value={0.5}>0.5x</option>
                      <option value={0.75}>0.75x</option>
                      <option value={1}>1x</option>
                      <option value={1.25}>1.25x</option>
                      <option value={1.5}>1.5x</option>
                      <option value={2}>2x</option>
                    </select>
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
            </div>
          </>
        ) : (
          <>
            <video
              key={url}
              src={url}
              crossOrigin=""
              preload="auto"
              onLoadedData={handleLoad}
              onError={handleError}
              onLoadStart={handleLoadStart}
              onCanPlay={handleCanPlay}
              onTimeUpdate={handleTimeUpdate}
              onLoadedMetadata={handleLoadedMetadata}
              onPlay={handlePlay}
              onPause={handlePause}
              onVolumeChange={handleVolumeChangeEvent}
              className="w-full h-full object-contain bg-black transition-opacity duration-300"
              style={{
                opacity: isLoading ? 0.3 : 1,
              }}
              title={title}
              playsInline
              controls={false}
              ref={(el) => {
                if (el) {
                  playerRef.current = el;
                }
              }}
            >
              Your browser does not support the video tag.
            </video>
            
            {/* Hidden preload videos for next videos */}
            <video
              ref={preloadRef}
              preload="auto"
              className="hidden"
              style={{ display: 'none' }}
            />
            <video
              ref={preloadRef2}
              preload="auto"
              className="hidden"
              style={{ display: 'none' }}
            />
            
            {/* Custom Controls Overlay for regular video */}
            <div className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent p-4 transition-opacity duration-300 z-20 pointer-events-auto ${showControls ? 'opacity-100' : 'opacity-0'}`}>
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
                    onClick={() => {
                      if (playerRef.current) {
                        if (isPlaying) {
                          playerRef.current.pause();
                        } else {
                          playerRef.current.play();
                        }
                      }
                    }}
                    className="text-white hover:bg-white/20 hover:text-white"
                  >
                    {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                  </Button>

                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => {
                      if (playerRef.current) {
                        playerRef.current.currentTime = Math.max(0, currentTime - 10);
                      }
                    }}
                    className="text-white hover:bg-white/20 hover:text-white"
                    title="Skip back 10s"
                  >
                    <SkipBack className="w-4 h-4" />
                  </Button>

                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => {
                      if (playerRef.current) {
                        playerRef.current.currentTime = Math.min(duration, currentTime + 10);
                      }
                    }}
                    className="text-white hover:bg-white/20 hover:text-white"
                    title="Skip forward 10s"
                  >
                    <SkipForward className="w-4 h-4" />
                  </Button>

                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => {
                      if (playerRef.current) {
                        playerRef.current.currentTime = 0;
                      }
                    }}
                    className="text-white hover:bg-white/20 hover:text-white"
                    title="Reset to beginning"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </Button>

                  <div className="flex items-center gap-2">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => {
                        if (playerRef.current) {
                          playerRef.current.muted = !isMuted;
                        }
                      }}
                      className="text-white hover:bg-white/20 hover:text-white"
                    >
                      {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                    </Button>
                    <div className="w-24">
                      <Slider
                        value={[volume]}
                        max={100}
                        step={1}
                        onValueChange={(value) => {
                          if (playerRef.current) {
                            playerRef.current.volume = value[0] / 100;
                          }
                        }}
                        className="cursor-pointer"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1">
                    <span className="text-white/80 text-sm">Speed:</span>
                    <select
                      value={playbackRate}
                      onChange={(e) => {
                        if (playerRef.current) {
                          playerRef.current.playbackRate = parseFloat(e.target.value);
                          setPlaybackRate(parseFloat(e.target.value));
                        }
                      }}
                      className="bg-black/50 text-white text-sm rounded px-2 py-1 border border-white/20"
                    >
                      <option value={0.5}>0.5x</option>
                      <option value={0.75}>0.75x</option>
                      <option value={1}>1x</option>
                      <option value={1.25}>1.25x</option>
                      <option value={1.5}>1.5x</option>
                      <option value={2}>2x</option>
                    </select>
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
            </div>
          </>
        )}
      </div>

      {/* Navigation arrows */}
      {urls.length > 1 && (
        <>
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              goToPrevious();
            }}
            disabled={currentIndex === 0 || isNavigating}
            className="absolute left-4 top-1/2 -translate-y-1/2 z-30 bg-black/70 backdrop-blur-sm hover:bg-black/90 border border-white/10 disabled:opacity-30 disabled:cursor-not-allowed text-white transition-all active:scale-95"
          >
            <ChevronLeft className={`h-6 w-6 ${isNavigating ? 'animate-pulse' : ''}`} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              goToNext();
            }}
            disabled={currentIndex === urls.length - 1 || isNavigating}
            className="absolute right-4 top-1/2 -translate-y-1/2 z-30 bg-black/70 backdrop-blur-sm hover:bg-black/90 border border-white/10 disabled:opacity-30 disabled:cursor-not-allowed text-white transition-all active:scale-95"
          >
            <ChevronRight className={`h-6 w-6 ${isNavigating ? 'animate-pulse' : ''}`} />
          </Button>
        </>
      )}
    </div>
  );
};

// Memoize component to prevent unnecessary re-renders
export default memo(VideoContainer);
