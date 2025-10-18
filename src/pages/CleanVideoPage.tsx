import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

interface VideoFile {
  key: string;
  url: string;
  size: number;
  lastModified: string;
  thumbnail?: string;
}

export default function CleanVideoPage() {
  const [bucketUrl, setBucketUrl] = useState('https://vid-just.cleverpoly-store.workers.dev');
  const [videos, setVideos] = useState<VideoFile[]>([]);
  const [loading, setLoading] = useState(false);

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
      setVideos([]);
    } finally {
      setLoading(false);
    }
  };

  const generateCleanVideoBox = () => {
    // Filter out thumbnail files and only include actual videos
    const actualVideos = videos.filter(video => 
      !video.key.startsWith('thumbnails/') && 
      !video.key.match(/\.(jpg|jpeg|png|gif|bmp|webp|svg|ico)$/i)
    );

    if (actualVideos.length === 0) {
      alert('No videos found in your bucket. Upload some videos first.');
      return;
    }

    const videoData = actualVideos.map(video => ({
      url: video.url,
      name: video.key
    }));

    // Generate JUST the video box - no page, no body, just the embeddable container
    const htmlCode = `<div class="video-box" style="
        width: 100%;
        max-width: 600px;
        margin: 0 auto;
        background: transparent;
        border-radius: 12px;
        overflow: hidden;
        box-shadow: 0 4px 20px rgba(0,0,0,0.1);
    ">
        <video id="videoPlayer" controls style="
            width: 100%; 
            height: auto; 
            display: block; 
            background: #000;
        ">
            <source src="${videoData[0]?.url || ''}" type="video/mp4">
            Your browser does not support the video tag.
        </video>
        <div class="controls" style="
            padding: 12px;
            background: rgba(0,0,0,0.85);
            color: white;
            text-align: center;
            border-radius: 0 0 12px 12px;
        ">
            <div style="margin-bottom: 8px;">
                <button class="nav-btn" id="prevBtn" onclick="previousVideo()" style="
                    padding: 6px 12px;
                    background: #6c757d;
                    color: white;
                    border: none;
                    border-radius: 6px;
                    cursor: pointer;
                    margin: 0 4px;
                    font-size: 12px;
                ">← Prev</button>
                <button class="nav-btn" id="nextBtn" onclick="nextVideo()" style="
                    padding: 6px 12px;
                    background: #6c757d;
                    color: white;
                    border: none;
                    border-radius: 6px;
                    cursor: pointer;
                    margin: 0 4px;
                    font-size: 12px;
                ">Next →</button>
            </div>
            <div>
                ${videoData.map((video, index) => 
                  `<button class="btn" onclick="playVideo(${index})" style="
                    padding: 6px 12px; 
                    margin: 2px; 
                    border: none; 
                    border-radius: 6px; 
                    cursor: pointer; 
                    background: #007bff; 
                    color: white; 
                    font-size: 12px;
                    transition: background 0.2s;
                  " onmouseover="this.style.background='#0056b3'" onmouseout="this.style.background='#007bff'">${index + 1}</button>`
                ).join('')}
            </div>
        </div>
    </div>

    <script>
        const videoData = ${JSON.stringify(videoData, null, 2)};
        let currentVideoIndex = 0;
        const videoElement = document.getElementById('videoPlayer');
        const prevBtn = document.getElementById('prevBtn');
        const nextBtn = document.getElementById('nextBtn');
        
        function updateUI() {
            const currentVideo = videoData[currentVideoIndex];
            videoElement.src = currentVideo.url;
            
            document.querySelectorAll('.btn').forEach((btn, i) => {
                if (i === currentVideoIndex) {
                    btn.style.background = '#28a745';
                } else {
                    btn.style.background = '#007bff';
                }
            });
            
            prevBtn.disabled = currentVideoIndex === 0;
            nextBtn.disabled = currentVideoIndex === videoData.length - 1;
            
            if (prevBtn.disabled) {
                prevBtn.style.background = '#e9ecef';
                prevBtn.style.color = '#6c757d';
                prevBtn.style.cursor = 'not-allowed';
            } else {
                prevBtn.style.background = '#6c757d';
                prevBtn.style.color = 'white';
                prevBtn.style.cursor = 'pointer';
            }
            
            if (nextBtn.disabled) {
                nextBtn.style.background = '#e9ecef';
                nextBtn.style.color = '#6c757d';
                nextBtn.style.cursor = 'not-allowed';
            } else {
                nextBtn.style.background = '#6c757d';
                nextBtn.style.color = 'white';
                nextBtn.style.cursor = 'pointer';
            }
            
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
        
        // Initialize
        if (videoData.length > 0) {
            updateUI();
        }
    </script>`;

    // Copy to clipboard
    navigator.clipboard.writeText(htmlCode).then(() => {
      alert('Clean video box HTML copied to clipboard!');
    }).catch(() => {
      alert('Failed to copy to clipboard. Please copy the code manually.');
    });
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      {/* Navigation */}
      <div className="fixed top-4 right-4 z-50">
        <Link
          to="/"
          className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors shadow-lg"
        >
          Back to Main
        </Link>
      </div>
      
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center space-y-4 mb-8">
          <h1 className="text-3xl font-bold text-gray-800">
            Clean Video Box Generator
          </h1>
          <p className="text-gray-600">
            Generate a clean, embeddable video player from your bucket videos
          </p>
        </div>

        {/* Bucket Connection */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Bucket Connection</h2>
          
          <div className="flex gap-2 mb-4">
            <input
              type="url"
              value={bucketUrl}
              onChange={(e) => setBucketUrl(e.target.value)}
              placeholder="Enter your Cloudflare Worker URL"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={fetchVideos}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {loading ? 'Loading...' : 'Refresh'}
            </button>
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-700">
                {videos.length > 0 ? `${videos.length} videos found` : 
                 loading ? 'Loading...' : 
                 'No videos found'}
              </p>
            </div>
            <button
              onClick={generateCleanVideoBox}
              disabled={videos.length === 0}
              className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Generate Clean Video Box
            </button>
          </div>
        </div>

        {/* Video List */}
        {videos.length > 0 && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Your Videos</h2>
            <div className="space-y-2">
              {videos.filter(video => 
                !video.key.startsWith('thumbnails/') && 
                !video.key.match(/\.(jpg|jpeg|png|gif|bmp|webp|svg|ico)$/i)
              ).map((video, index) => (
                <div key={video.key} className="flex items-center justify-between bg-gray-50 p-3 rounded-md">
                  <span className="text-sm text-gray-600">
                    {index + 1}. {video.key}
                  </span>
                  <span className="text-xs text-gray-500">
                    {(video.size / 1024 / 1024).toFixed(1)} MB
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}