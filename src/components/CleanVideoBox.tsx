import { useState, useEffect, useRef } from "react";
import { Play, Pause, Volume2, VolumeX, Maximize, ChevronLeft, ChevronRight, SkipBack, SkipForward, RotateCcw } from "lucide-react";

interface CleanVideoBoxProps {
  urls: string[];
  width?: number;
  height?: number;
  autoplay?: boolean;
  loop?: boolean;
  muted?: boolean;
  showControls?: boolean;
  className?: string;
}

const CleanVideoBox = ({ 
  urls, 
  width = 800, 
  height = 450, 
  autoplay = false, 
  loop = false, 
  muted = false, 
  showControls = true,
  className = "" 
}: CleanVideoBoxProps) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const url = urls[currentIndex] || "";
  
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(muted);
  const [volume, setVolume] = useState(100);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [showControlsOverlay, setShowControlsOverlay] = useState(showControls);
  
  const playerRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const intervalRef = useRef<number | null>(null);
  const hideControlsTimeout = useRef<number | null>(null);

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

  const handleError = () => {
    setIsLoading(false);
    setHasError(true);
  };

  // Reset state when video changes
  useEffect(() => {
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    setIsLoading(true);
    setHasError(false);
  }, [currentIndex]);

  const togglePlay = () => {
    if (!playerRef.current) return;
    if (isPlaying) {
      playerRef.current.pause();
    } else {
      playerRef.current.play();
    }
  };

  const toggleMute = () => {
    if (!playerRef.current) return;
    playerRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const handleVolumeChange = (value: number[]) => {
    if (!playerRef.current) return;
    const newVolume = value[0];
    setVolume(newVolume);
    playerRef.current.volume = newVolume / 100;
    if (newVolume === 0) {
      setIsMuted(true);
    } else if (isMuted) {
      setIsMuted(false);
    }
  };

  const handleSeek = (value: number[]) => {
    if (!playerRef.current) return;
    const newTime = value[0];
    playerRef.current.currentTime = newTime;
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

  const skipBackward = () => {
    if (!playerRef.current) return;
    const newTime = Math.max(0, currentTime - 10);
    playerRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const skipForward = () => {
    if (!playerRef.current) return;
    const newTime = Math.min(duration, currentTime + 10);
    playerRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const handlePlaybackRateChange = (rate: number) => {
    if (!playerRef.current) return;
    setPlaybackRate(rate);
    playerRef.current.playbackRate = rate;
  };

  const resetVideo = () => {
    if (!playerRef.current) return;
    playerRef.current.currentTime = 0;
    setCurrentTime(0);
  };

  const handleMouseMove = () => {
    if (!showControls) return;
    setShowControlsOverlay(true);
    if (hideControlsTimeout.current) {
      clearTimeout(hideControlsTimeout.current);
    }
    hideControlsTimeout.current = window.setTimeout(() => {
      setShowControlsOverlay(false);
    }, 3000);
  };

  const handleMouseLeave = () => {
    if (!showControls) return;
    if (hideControlsTimeout.current) {
      clearTimeout(hideControlsTimeout.current);
    }
    hideControlsTimeout.current = window.setTimeout(() => {
      setShowControlsOverlay(false);
    }, 1000);
  };

  if (!urls.length || !url) {
    return (
      <div 
        className={`relative bg-transparent border border-gray-300 rounded-lg flex items-center justify-center ${className}`}
        style={{ width: `${width}px`, height: `${height}px` }}
      >
        <div className="text-center text-gray-500">
          <Play className="w-12 h-12 mx-auto mb-2" />
          <p>No video URL provided</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative" style={{ width: `${width}px`, height: `${height}px` }}>
      {/* Video counter */}
      {urls.length > 1 && (
        <div className="absolute top-4 right-4 z-30 bg-black/70 backdrop-blur-sm px-3 py-1 rounded-full text-sm text-white/90 border border-white/10">
          {currentIndex + 1} / {urls.length}
        </div>
      )}

      <div 
        ref={containerRef}
        className={`relative w-full h-full rounded-lg overflow-hidden bg-transparent border border-gray-300 group ${className}`}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/20 backdrop-blur-sm z-10">
            <Play className="w-16 h-16 text-white animate-pulse" />
          </div>
        )}
        
        {hasError && (
          <div className="absolute inset-0 flex items-center justify-center bg-red-100 z-10">
            <div className="text-center text-red-600">
              <p className="font-medium">Failed to load video</p>
              <p className="text-sm">Please check the URL</p>
            </div>
          </div>
        )}

        {isYouTube(url) ? (
          <>
            <iframe
              src={getYouTubeEmbedUrl(url)}
              className="w-full h-full"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              title="YouTube video player"
            />
          </>
        ) : (
          <>
            <video
              key={url}
              ref={playerRef}
              src={url}
              crossOrigin=""
              preload="metadata"
              onLoadedData={handleLoad}
              onError={handleError}
              onLoadStart={() => setIsLoading(true)}
              onCanPlay={() => setIsLoading(false)}
              onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
              onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              onVolumeChange={(e) => {
                setVolume(e.currentTarget.volume * 100);
                setIsMuted(e.currentTarget.muted);
              }}
              className="w-full h-full object-contain bg-black"
              playsInline
              controls={false}
              autoPlay={autoplay}
              loop={loop}
              muted={muted}
            >
              Your browser does not support the video tag.
            </video>
            
            {/* Custom Controls Overlay */}
            {showControls && (
              <div className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent p-4 transition-opacity duration-300 z-20 pointer-events-auto ${showControlsOverlay ? 'opacity-100' : 'opacity-0'}`}>
                {/* Progress Bar */}
                <div className="mb-3">
                  <input
                    type="range"
                    min="0"
                    max={duration}
                    step="0.1"
                    value={currentTime}
                    onChange={(e) => handleSeek([parseFloat(e.target.value)])}
                    className="w-full h-1 bg-white/30 rounded-lg appearance-none cursor-pointer slider"
                    style={{
                      background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${(currentTime / duration) * 100}%, rgba(255,255,255,0.3) ${(currentTime / duration) * 100}%, rgba(255,255,255,0.3) 100%)`
                    }}
                  />
                  <div className="flex justify-between text-xs text-white/80 mt-1">
                    <span>{formatTime(currentTime)}</span>
                    <span>{formatTime(duration)}</span>
                  </div>
                </div>

                {/* Control Buttons */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={togglePlay}
                      className="text-white hover:bg-white/20 hover:text-white p-2 rounded transition-colors"
                    >
                      {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                    </button>

                    <button
                      onClick={skipBackward}
                      className="text-white hover:bg-white/20 hover:text-white p-2 rounded transition-colors"
                      title="Skip back 10s"
                    >
                      <SkipBack className="w-4 h-4" />
                    </button>

                    <button
                      onClick={skipForward}
                      className="text-white hover:bg-white/20 hover:text-white p-2 rounded transition-colors"
                      title="Skip forward 10s"
                    >
                      <SkipForward className="w-4 h-4" />
                    </button>

                    <button
                      onClick={resetVideo}
                      className="text-white hover:bg-white/20 hover:text-white p-2 rounded transition-colors"
                      title="Reset to beginning"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </button>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={toggleMute}
                        className="text-white hover:bg-white/20 hover:text-white p-2 rounded transition-colors"
                      >
                        {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                      </button>
                      <div className="w-24">
                        <input
                          type="range"
                          min="0"
                          max="100"
                          step="1"
                          value={volume}
                          onChange={(e) => handleVolumeChange([parseFloat(e.target.value)])}
                          className="w-full h-1 bg-white/30 rounded-lg appearance-none cursor-pointer slider"
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

                    <button
                      onClick={toggleFullscreen}
                      className="text-white hover:bg-white/20 hover:text-white p-2 rounded transition-colors"
                    >
                      <Maximize className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Navigation arrows */}
      {urls.length > 1 && (
        <>
          <button
            onClick={goToPrevious}
            disabled={currentIndex === 0}
            className="absolute left-4 top-1/2 -translate-y-1/2 z-30 bg-black/70 backdrop-blur-sm hover:bg-black/90 border border-white/10 disabled:opacity-30 disabled:cursor-not-allowed text-white p-2 rounded transition-colors"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
          <button
            onClick={goToNext}
            disabled={currentIndex === urls.length - 1}
            className="absolute right-4 top-1/2 -translate-y-1/2 z-30 bg-black/70 backdrop-blur-sm hover:bg-black/90 border border-white/10 disabled:opacity-30 disabled:cursor-not-allowed text-white p-2 rounded transition-colors"
          >
            <ChevronRight className="h-6 w-6" />
          </button>
        </>
      )}

      <style jsx>{`
        .slider::-webkit-slider-thumb {
          appearance: none;
          height: 16px;
          width: 16px;
          border-radius: 50%;
          background: #3b82f6;
          cursor: pointer;
          border: 2px solid white;
          box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        }
        
        .slider::-moz-range-thumb {
          height: 16px;
          width: 16px;
          border-radius: 50%;
          background: #3b82f6;
          cursor: pointer;
          border: 2px solid white;
          box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        }
      `}</style>
    </div>
  );
};

export default CleanVideoBox;
