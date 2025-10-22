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
  const [isNavigating, setIsNavigating] = useState(false);
  const [slideDirection, setSlideDirection] = useState<'left' | 'right' | null>(null);
  const [showControls, setShowControls] = useState(true);
  
  // Video states for each video
  const [videoStates, setVideoStates] = useState<Map<number, {
    isLoading: boolean;
    hasError: boolean;
    errorMessage: string;
    isPlaying: boolean;
    isMuted: boolean;
    volume: number;
    currentTime: number;
    duration: number;
    playbackRate: number;
  }>>(new Map());
  
  const playerRefs = useRef<Map<number, HTMLVideoElement>>(new Map());
  const youtubePlayerRefs = useRef<Map<number, unknown>>(new Map());
  const containerRef = useRef<HTMLDivElement>(null);
  const intervalRefs = useRef<Map<number, number>>(new Map());
  const hideControlsTimeout = useRef<number | null>(null);
  const animationTimeoutRef = useRef<number | null>(null);
  const preloadRefs = useRef<Map<number, HTMLVideoElement>>(new Map());
  const [preloadedVideos, setPreloadedVideos] = useState<Set<number>>(new Set());

  // Helper functions for video state management
  const getVideoState = useCallback((index: number) => {
    return videoStates.get(index) || {
      isLoading: true,
      hasError: false,
      errorMessage: "",
      isPlaying: false,
      isMuted: false,
      volume: 100,
      currentTime: 0,
      duration: 0,
      playbackRate: 1,
    };
  }, [videoStates]);

  const updateVideoState = useCallback((index: number, updates: Partial<typeof getVideoState>) => {
    setVideoStates(prev => {
      const newMap = new Map(prev);
      const currentState = newMap.get(index) || getVideoState(index);
      newMap.set(index, { ...currentState, ...updates });
      return newMap;
    });
  }, [getVideoState]);

  // Memoize video type detection to prevent recalculation
  const isYouTube = useCallback((url: string) => {
    return url.includes('youtube.com') || url.includes('youtu.be');
  }, []);

  const isCloudflareStream = useCallback((url: string) => {
    return url.includes('cloudflarestream.com');
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

  // Event handlers for individual videos
  const handleLoad = useCallback((index: number) => {
    updateVideoState(index, { isLoading: false });
  }, [updateVideoState]);

  const handleError = useCallback((index: number, event?: React.SyntheticEvent<HTMLVideoElement, Event>) => {
    const url = urls[index];
    const isStreamUrl = url.includes('cloudflarestream.com');
    const isExternalUrl = !url.startsWith(window.location.origin);
    
    let errorMessage = "Failed to load video.";
    const video = event?.currentTarget;
    if (video) {
      const error = video.error;
      if (error) {
        switch (error.code) {
          case 1: // MEDIA_ERR_ABORTED
            errorMessage = isStreamUrl ? 
              "Video loading was aborted. Cloudflare Stream video may be processing or unavailable." : 
              "Video loading was aborted.";
            break;
          case 2: // MEDIA_ERR_NETWORK
            errorMessage = isStreamUrl ? 
              "Network error occurred while loading Cloudflare Stream video. Check your internet connection." : 
              "Network error occurred while loading video. Check your internet connection.";
            break;
          case 3: // MEDIA_ERR_DECODE
            errorMessage = "Video format not supported or corrupted.";
            break;
          case 4: // MEDIA_ERR_SRC_NOT_SUPPORTED
            errorMessage = isStreamUrl ? 
              "Cloudflare Stream video not available. The video may still be processing." : 
              "Video source not supported. Check the URL and file format.";
            break;
          default:
            errorMessage = isStreamUrl ? 
              "Unknown error occurred while loading Cloudflare Stream video." : 
              "Unknown error occurred while loading video.";
        }
      }
    }
    
    updateVideoState(index, { 
      isLoading: false, 
      hasError: true, 
      errorMessage 
    });
  }, [updateVideoState, urls]);

  // Load YouTube IFrame API
  useEffect(() => {
    const currentUrl = urls[currentIndex];
    if (!currentUrl || !isYouTube(currentUrl)) return;

    // Check if YouTube API is already loaded
    if ((window as any).YT && (window as any).YT.Player) {
      initializeYouTubePlayer(currentUrl, currentIndex);
      return;
    }

    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    const firstScriptTag = document.getElementsByTagName('script')[0];
    firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);

    (window as any).onYouTubeIframeAPIReady = () => {
      initializeYouTubePlayer(currentUrl, currentIndex);
    };
  }, [currentIndex, urls]);

  const initializeYouTubePlayer = useCallback((url: string, index: number) => {
    const videoId = getYouTubeVideoId(url);
    if (!videoId) return;

    const playerElement = document.getElementById(`youtube-player-${index}`);
    if (!playerElement) return;

    const player = new (window as any).YT.Player(`youtube-player-${index}`, {
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
          updateVideoState(index, { 
            isLoading: false,
            duration: event.target.getDuration()
          });
        },
        onStateChange: (event: any) => {
          const isPlaying = event.data === (window as any).YT.PlayerState.PLAYING;
          updateVideoState(index, { isPlaying });
        },
        onError: () => {
          handleError(index);
        }
      }
    });

    youtubePlayerRefs.current.set(index, player);
  }, [updateVideoState, handleError]);

  // Reset state when video changes
  useEffect(() => {
    const currentUrl = urls[currentIndex];
    if (!currentUrl) return;

    // Initialize video state for current index if not exists
    if (!videoStates.has(currentIndex)) {
      updateVideoState(currentIndex, {
        isLoading: true,
        hasError: false,
        errorMessage: "",
        isPlaying: false,
        isMuted: false,
        volume: 100,
        currentTime: 0,
        duration: 0,
        playbackRate: 1,
      });
    }
    
    // Clear navigation state after animation completes
    const timer = setTimeout(() => {
      setIsNavigating(false);
    }, 200); // Match animation duration
    
    // Clean up previous YouTube player if it exists
    const prevIndex = currentIndex > 0 ? currentIndex - 1 : currentIndex + 1;
    const prevPlayer = youtubePlayerRefs.current.get(prevIndex);
    if (prevPlayer && prevPlayer.destroy) {
      prevPlayer.destroy();
      youtubePlayerRefs.current.delete(prevIndex);
    }
    
    return () => {
      clearTimeout(timer);
      if (animationTimeoutRef.current) {
        clearTimeout(animationTimeoutRef.current);
      }
    };
  }, [currentIndex, urls, videoStates, updateVideoState]);

  // Preload videos for better performance
  useEffect(() => {
    const preloadVideos = async () => {
      const newPreloadedVideos = new Set<number>();
      
      for (let i = 0; i < urls.length; i++) {
        if (isYouTube(urls[i]) || isCloudflareStream(urls[i])) {
          newPreloadedVideos.add(i);
          continue;
        }
        
        try {
          // Create video element for preloading
          const video = document.createElement('video');
          video.crossOrigin = '';
          video.preload = 'metadata';
          video.src = urls[i];
          
          // Store reference
          preloadRefs.current.set(i, video);
          
          // Wait for metadata to load
          await new Promise((resolve, reject) => {
            video.addEventListener('loadedmetadata', resolve);
            video.addEventListener('error', reject);
            video.load();
            
            // Timeout after 5 seconds
            setTimeout(() => resolve(video), 5000);
          });
          
          newPreloadedVideos.add(i);
          console.log(`Preloaded video ${i + 1}/${urls.length}`);
        } catch (error) {
          console.warn(`Failed to preload video ${i + 1}:`, error);
        }
      }
      
      setPreloadedVideos(newPreloadedVideos);
    };
    
    if (urls.length > 0) {
      preloadVideos();
    }
    
    // Cleanup function
    return () => {
      preloadRefs.current.forEach((video) => {
        video.src = '';
        video.load();
      });
      preloadRefs.current.clear();
    };
  }, [urls, isYouTube]);

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
    
    // Stop current video
    const currentPlayer = playerRefs.current.get(currentIndex);
    const currentUrl = urls[currentIndex];
    if (currentPlayer && !isYouTube(currentUrl) && !isCloudflareStream(currentUrl)) {
      currentPlayer.pause();
      currentPlayer.currentTime = 0;
    }
    
    // Set navigating and slide direction INSTANTLY
    setIsNavigating(true);
    setSlideDirection('left');
    
    // Change index immediately - no delays, no checks
    setCurrentIndex(prev => prev + 1);
    
    // Clear slide animation after CSS transition completes
    if (animationTimeoutRef.current) {
      clearTimeout(animationTimeoutRef.current);
    }
    animationTimeoutRef.current = window.setTimeout(() => {
      setSlideDirection(null);
      setIsNavigating(false);
    }, 200);
  }, [isNavigating, currentIndex, urls.length, urls, isYouTube, isCloudflareStream]);

  const goToPrevious = useCallback(() => {
    if (isNavigating || currentIndex <= 0) return;
    
    // Stop current video
    const currentPlayer = playerRefs.current.get(currentIndex);
    const currentUrl = urls[currentIndex];
    if (currentPlayer && !isYouTube(currentUrl) && !isCloudflareStream(currentUrl)) {
      currentPlayer.pause();
      currentPlayer.currentTime = 0;
    }
    
    // Set navigating and slide direction INSTANTLY
    setIsNavigating(true);
    setSlideDirection('right');
    
    // Change index immediately - no delays, no checks
    setCurrentIndex(prev => prev - 1);
    
    // Clear slide animation after CSS transition completes
    if (animationTimeoutRef.current) {
      clearTimeout(animationTimeoutRef.current);
    }
    animationTimeoutRef.current = window.setTimeout(() => {
      setSlideDirection(null);
      setIsNavigating(false);
    }, 200);
  }, [isNavigating, currentIndex, urls, isYouTube, isCloudflareStream]);


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

  if (!urls.length) {
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
        style={{ 
          boxShadow: 'var(--video-shadow)',
        }}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        {/* Instagram-style carousel - all videos rendered simultaneously */}
        <div className="relative w-full h-full">
          {urls.map((url, index) => {
            const videoState = getVideoState(index);
            const isActive = index === currentIndex;
            const isYouTubeVideo = isYouTube(url);
            
            return (
              <div
                key={index}
                className={`absolute inset-0 w-full h-full transition-transform duration-200 ease-out ${
                  isActive ? 'translate-x-0' : 
                  index < currentIndex ? '-translate-x-full' : 
                  'translate-x-full'
                }`}
                style={{
                  zIndex: isActive ? 10 : 5,
                }}
              >
                {/* Loading state */}
                {videoState.isLoading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-secondary/90 to-secondary/70 backdrop-blur-sm z-20">
                    <div className="relative">
                      <div className="w-24 h-24 rounded-full bg-primary/20 animate-pulse flex items-center justify-center">
                        <div className="w-16 h-16 rounded-full bg-primary/30 animate-pulse flex items-center justify-center">
                          <Play className="w-8 h-8 text-primary animate-pulse" />
                        </div>
                      </div>
                      <p className="text-center mt-4 text-sm text-muted-foreground animate-pulse">
                        Loading video {index + 1}...
                      </p>
                    </div>
          </div>
        )}
        
                {/* Error state */}
                {videoState.hasError && (
                  <div className="absolute inset-0 flex items-center justify-center bg-secondary z-20">
            <div className="text-center max-w-md px-4">
              <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-2" />
                      <p className="text-foreground font-medium">Failed to load video {index + 1}</p>
                      <p className="text-sm text-muted-foreground mt-1">{videoState.errorMessage}</p>
            </div>
          </div>
        )}

                {/* Video content */}
                {!videoState.hasError && (
                  <>
                    {isYouTubeVideo ? (
                      <div id={`youtube-player-${index}`} className="w-full h-full pointer-events-none" />
                    ) : isCloudflareStream(url) ? (
                      <iframe
                        src={url}
                        className="w-full h-full border-0"
                        title={`${title} - Video ${index + 1}`}
                        allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        onLoad={() => handleLoad(index)}
                        onError={() => handleError(index)}
                      />
                    ) : (
            <video
              src={url}
              crossOrigin=""
              preload="metadata"
                        onLoadedData={() => handleLoad(index)}
                        onError={(e) => handleError(index, e)}
                        onTimeUpdate={(e) => {
                          const video = e.currentTarget;
                          updateVideoState(index, { 
                            currentTime: video.currentTime,
                            duration: video.duration || 0
                          });
                        }}
                        onLoadedMetadata={(e) => {
                          const video = e.currentTarget;
                          updateVideoState(index, { 
                            duration: video.duration,
                            volume: video.volume * 100,
                            isMuted: video.muted
                          });
                        }}
                        onPlay={() => updateVideoState(index, { isPlaying: true })}
                        onPause={() => updateVideoState(index, { isPlaying: false })}
              onVolumeChange={(e) => {
                          const video = e.currentTarget;
                          updateVideoState(index, { 
                            volume: video.volume * 100,
                            isMuted: video.muted
                          });
              }}
              className="w-full h-full object-contain bg-black"
                        title={`${title} - Video ${index + 1}`}
              playsInline
              controls={false}
              ref={(el) => {
                if (el) {
                            playerRefs.current.set(index, el);
                }
              }}
            >
              Your browser does not support the video tag.
            </video>
                    )}
            
                    {/* Controls overlay - only show for active video and non-iframe videos */}
                    {isActive && !isCloudflareStream(url) && (
                      <div className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent p-4 transition-opacity duration-300 z-30 pointer-events-auto ${showControls ? 'opacity-100' : 'opacity-0'}`}>
              {/* Progress Bar */}
              <div className="mb-3">
                <Slider
                            value={[videoState.currentTime]}
                            max={videoState.duration}
                  step={0.1}
                            onValueChange={(value) => {
                              const player = playerRefs.current.get(index);
                              if (player && !isYouTubeVideo) {
                                player.currentTime = value[0];
                                updateVideoState(index, { currentTime: value[0] });
                              }
                            }}
                  className="cursor-pointer"
                />
                <div className="flex justify-between text-xs text-white/80 mt-1">
                            <span>{formatTime(videoState.currentTime)}</span>
                            <span>{formatTime(videoState.duration)}</span>
                </div>
              </div>

              {/* Control Buttons */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => {
                                const player = playerRefs.current.get(index);
                                if (player && !isYouTubeVideo) {
                                  if (videoState.isPlaying) {
                                    player.pause();
                        } else {
                                    player.play();
                        }
                      }
                    }}
                    className="text-white hover:bg-white/20 hover:text-white"
                  >
                              {videoState.isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                  </Button>

                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => {
                                const player = playerRefs.current.get(index);
                                if (player && !isYouTubeVideo) {
                                  const newTime = Math.max(0, videoState.currentTime - 10);
                                  player.currentTime = newTime;
                                  updateVideoState(index, { currentTime: newTime });
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
                                const player = playerRefs.current.get(index);
                                if (player && !isYouTubeVideo) {
                                  const newTime = Math.min(videoState.duration, videoState.currentTime + 10);
                                  player.currentTime = newTime;
                                  updateVideoState(index, { currentTime: newTime });
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
                                const player = playerRefs.current.get(index);
                                if (player && !isYouTubeVideo) {
                                  player.currentTime = 0;
                                  updateVideoState(index, { currentTime: 0 });
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
                                  const player = playerRefs.current.get(index);
                                  if (player && !isYouTubeVideo) {
                                    player.muted = !videoState.isMuted;
                                    updateVideoState(index, { isMuted: !videoState.isMuted });
                        }
                      }}
                      className="text-white hover:bg-white/20 hover:text-white"
                    >
                                {videoState.isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                    </Button>
                    <div className="w-24">
                      <Slider
                                  value={[videoState.volume]}
                        max={100}
                        step={1}
                        onValueChange={(value) => {
                                    const player = playerRefs.current.get(index);
                                    if (player && !isYouTubeVideo) {
                                      player.volume = value[0] / 100;
                                      updateVideoState(index, { volume: value[0] });
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
                                value={videoState.playbackRate}
                      onChange={(e) => {
                                  const player = playerRefs.current.get(index);
                                  if (player && !isYouTubeVideo) {
                                    const rate = parseFloat(e.target.value);
                                    player.playbackRate = rate;
                                    updateVideoState(index, { playbackRate: rate });
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
                    )}
          </>
        )}
              </div>
            );
          })}
        </div>
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
