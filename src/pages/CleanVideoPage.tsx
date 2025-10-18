import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import CleanVideoBox from '../components/CleanVideoBox';

export default function CleanVideoPage() {
  const [videoUrls, setVideoUrls] = useState<string[]>([]);
  const [inputUrl, setInputUrl] = useState('');
  const [width, setWidth] = useState(800);
  const [height, setHeight] = useState(450);
  const [autoplay, setAutoplay] = useState(false);
  const [loop, setLoop] = useState(false);
  const [muted, setMuted] = useState(false);
  const [showControls, setShowControls] = useState(true);

  const addVideoUrl = () => {
    if (inputUrl.trim() && !videoUrls.includes(inputUrl.trim())) {
      setVideoUrls([...videoUrls, inputUrl.trim()]);
      setInputUrl('');
    }
  };

  const removeVideoUrl = (index: number) => {
    setVideoUrls(videoUrls.filter((_, i) => i !== index));
  };

  const generateCodeSnippet = () => {
    if (videoUrls.length === 0) {
      alert('Please add at least one video URL first.');
      return;
    }

    const videoData = videoUrls.map((url, index) => ({
      url,
      name: `Video ${index + 1}`
    }));

    const htmlCode = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Clean Video Player</title>
    <style>
        * { box-sizing: border-box; }
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
            margin: 0; 
            padding: 20px; 
            background: transparent; /* Transparent background */
            min-height: 100vh;
        }
        .video-container { 
            background: transparent; /* Transparent background */
            border-radius: 12px; 
            overflow: hidden; 
            box-shadow: 0 4px 20px rgba(0,0,0,0.1);
            margin: 0 auto;
            max-width: ${width}px;
        }
        video { 
            width: 100%; 
            height: auto; 
            display: block; 
            background: #000;
        }
        .video-info { 
            padding: 15px 20px; 
            background: rgba(248, 249, 250, 0.9); 
            border-bottom: 1px solid #e9ecef;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .video-title {
            font-weight: 600;
            color: #333;
            margin: 0;
        }
        .video-counter {
            background: #007bff;
            color: white;
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 500;
        }
        .controls { 
            padding: 20px; 
            background: rgba(255, 255, 255, 0.9);
        }
        .btn { 
            padding: 10px 20px; 
            margin: 5px; 
            border: none; 
            border-radius: 6px; 
            cursor: pointer; 
            background: #007bff; 
            color: white; 
            font-weight: 500;
            transition: all 0.3s ease;
            font-size: 14px;
        }
        .btn:hover { 
            background: #0056b3; 
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(0,123,255,0.3);
        }
        .btn.active { 
            background: #28a745; 
            box-shadow: 0 4px 12px rgba(40,167,69,0.3);
        }
        .navigation {
            display: flex;
            justify-content: center;
            gap: 10px;
            margin-top: 15px;
        }
        .nav-btn {
            padding: 12px 24px;
            background: #6c757d;
            color: white;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-weight: 500;
            transition: all 0.3s ease;
        }
        .nav-btn:hover:not(:disabled) {
            background: #5a6268;
            transform: translateY(-2px);
        }
        .nav-btn:disabled {
            background: #e9ecef;
            color: #6c757d;
            cursor: not-allowed;
        }
        .error-message {
            background: #f8d7da;
            color: #721c24;
            padding: 15px;
            border-radius: 6px;
            margin: 10px 0;
            border: 1px solid #f5c6cb;
        }
        @media (max-width: 768px) {
            body { padding: 10px; }
            .btn { padding: 8px 16px; font-size: 13px; }
            .nav-btn { padding: 10px 20px; }
        }
    </style>
</head>
<body>
    <div class="video-container">
        <video id="videoPlayer" controls poster="" autoplay="${autoplay}" loop="${loop}" muted="${muted}">
            <source src="${videoData[0]?.url || ''}" type="video/mp4">
            Your browser does not support the video tag.
        </video>
        <div class="video-info">
            <h3 class="video-title" id="videoTitle">${videoData[0]?.name || 'Video 1'}</h3>
            <span class="video-counter" id="videoCounter">1 / ${videoData.length}</span>
        </div>
        <div class="controls">
            <div class="navigation">
                <button class="nav-btn" id="prevBtn" onclick="previousVideo()">← Previous</button>
                <button class="nav-btn" id="nextBtn" onclick="nextVideo()">Next →</button>
            </div>
            <div style="margin-top: 15px; text-align: center;">
                ${videoData.map((video, index) => 
                  `<button class="btn" onclick="playVideo(${index})" title="${video.name}">Video ${index + 1}</button>`
                ).join('\n                ')}
            </div>
        </div>
    </div>

    <script>
        const videoData = ${JSON.stringify(videoData, null, 2)};
        let currentVideoIndex = 0;
        const videoElement = document.getElementById('videoPlayer');
        const videoTitle = document.getElementById('videoTitle');
        const videoCounter = document.getElementById('videoCounter');
        const prevBtn = document.getElementById('prevBtn');
        const nextBtn = document.getElementById('nextBtn');
        
        function updateUI() {
            // Update video source
            const currentVideo = videoData[currentVideoIndex];
            videoElement.src = currentVideo.url;
            
            // Update video title and counter
            videoTitle.textContent = currentVideo.name;
            videoCounter.textContent = \`\${currentVideoIndex + 1} / \${videoData.length}\`;
            
            // Update button states
            document.querySelectorAll('.btn').forEach((btn, i) => {
                btn.classList.toggle('active', i === currentVideoIndex);
            });
            
            // Update navigation buttons
            prevBtn.disabled = currentVideoIndex === 0;
            nextBtn.disabled = currentVideoIndex === videoData.length - 1;
            
            // Load the video
            videoElement.load();
        }
        
        function playVideo(index) {
            if (index >= 0 && index < videoData.length) {
                currentVideoIndex = index;
                updateUI();
            }
        }
        
        function nextVideo() {
            if (currentVideoIndex < videoData.length - 1) {
                currentVideoIndex++;
                updateUI();
            }
        }
        
        function previousVideo() {
            if (currentVideoIndex > 0) {
                currentVideoIndex--;
                updateUI();
            }
        }
        
        // Keyboard navigation
        document.addEventListener('keydown', function(e) {
            if (e.key === 'ArrowLeft') {
                previousVideo();
            } else if (e.key === 'ArrowRight') {
                nextVideo();
            }
        });
        
        // Initialize with first video
        if (videoData.length > 0) {
            updateUI();
        }
        
        // Handle video errors
        videoElement.addEventListener('error', function(e) {
            console.error('Video load error:', e);
            videoTitle.textContent = 'Error loading video';
            const errorDiv = document.createElement('div');
            errorDiv.className = 'error-message';
            errorDiv.textContent = 'Failed to load video. Please check the URL or try another video.';
            document.querySelector('.controls').insertBefore(errorDiv, document.querySelector('.navigation'));
        });
        
        // Auto-hide error messages after 5 seconds
        setInterval(() => {
            const errorMsg = document.querySelector('.error-message');
            if (errorMsg) {
                errorMsg.remove();
            }
        }, 5000);
    </script>
</body>
</html>`;

    // Copy to clipboard
    navigator.clipboard.writeText(htmlCode).then(() => {
      alert('HTML code generated and copied to clipboard!');
    }).catch(() => {
      alert('Failed to copy to clipboard. Please copy the code manually.');
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
      {/* Navigation */}
      <div className="fixed top-4 right-4 z-50">
        <Link
          to="/"
          className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors shadow-lg"
        >
          Back to Main
        </Link>
      </div>
      
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold text-gray-800">
            Clean Video Box Generator
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Create a clean, embeddable video player with transparent background for any website
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Configuration Panel */}
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-2xl font-semibold text-gray-800 mb-4">Configuration</h2>
              
              {/* Video URLs */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Video URLs
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="url"
                      value={inputUrl}
                      onChange={(e) => setInputUrl(e.target.value)}
                      placeholder="Enter video URL (YouTube, MP4, etc.)"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      onKeyPress={(e) => e.key === 'Enter' && addVideoUrl()}
                    />
                    <button
                      onClick={addVideoUrl}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                    >
                      Add
                    </button>
                  </div>
                </div>

                {/* Video List */}
                {videoUrls.length > 0 && (
                  <div className="space-y-2">
                    {videoUrls.map((url, index) => (
                      <div key={index} className="flex items-center justify-between bg-gray-50 p-3 rounded-md">
                        <span className="text-sm text-gray-600 truncate flex-1 mr-2">
                          {url}
                        </span>
                        <button
                          onClick={() => removeVideoUrl(index)}
                          className="text-red-600 hover:text-red-800 text-sm"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Settings */}
              <div className="grid grid-cols-2 gap-4 mt-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Width (px)
                  </label>
                  <input
                    type="number"
                    value={width}
                    onChange={(e) => setWidth(parseInt(e.target.value) || 800)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Height (px)
                  </label>
                  <input
                    type="number"
                    value={height}
                    onChange={(e) => setHeight(parseInt(e.target.value) || 450)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Options */}
              <div className="space-y-3 mt-6">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={autoplay}
                    onChange={(e) => setAutoplay(e.target.checked)}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700">Autoplay</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={loop}
                    onChange={(e) => setLoop(e.target.checked)}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700">Loop</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={muted}
                    onChange={(e) => setMuted(e.target.checked)}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700">Muted</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={showControls}
                    onChange={(e) => setShowControls(e.target.checked)}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700">Show Controls</span>
                </label>
              </div>

              {/* Generate Button */}
              <button
                onClick={generateCodeSnippet}
                className="w-full mt-6 px-6 py-3 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors font-medium"
              >
                Generate HTML Code
              </button>
            </div>
          </div>

          {/* Preview Panel */}
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-2xl font-semibold text-gray-800 mb-4">Preview</h2>
              
              {videoUrls.length > 0 ? (
                <div className="flex justify-center">
                  <CleanVideoBox
                    urls={videoUrls}
                    width={width}
                    height={height}
                    autoplay={autoplay}
                    loop={loop}
                    muted={muted}
                    showControls={showControls}
                  />
                </div>
              ) : (
                <div className="flex items-center justify-center h-64 bg-gray-100 rounded-lg">
                  <div className="text-center text-gray-500">
                    <p className="text-lg">Add video URLs to see preview</p>
                    <p className="text-sm mt-2">The video player will appear here</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
