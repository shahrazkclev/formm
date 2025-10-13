// Corrected Cloudflare Worker for Video Anywhere Box
// Your binding name is "just-vids" (not "VIDEO_BUCKET")
// Copy this entire code into your Cloudflare Worker

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    // CORS headers for ALL responses
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, Range',
      'Access-Control-Max-Age': '86400',
    };

    // Handle preflight requests
    if (method === 'OPTIONS') {
      return new Response(null, { 
        status: 200, 
        headers: corsHeaders 
      });
    }

    try {
      // Route: List all videos in the bucket
      if (path === '/list-videos' && method === 'GET') {
        return await listVideos(env, corsHeaders);
      }

      // Route: Upload video to bucket
      if (path === '/upload' && method === 'POST') {
        return await uploadVideo(request, env, corsHeaders);
      }

      // Route: Upload thumbnail for a video
      if (path === '/upload-thumbnail' && method === 'POST') {
        return await uploadThumbnail(request, env, corsHeaders);
      }

      // Route: Get video by key
      if (path.startsWith('/video/') && method === 'GET') {
        const videoKey = path.replace('/video/', '');
        return await getVideo(videoKey, env, corsHeaders);
      }

      // Route: Delete video
      if (path.startsWith('/delete/') && method === 'DELETE') {
        const videoKey = path.replace('/delete/', '');
        return await deleteVideo(videoKey, env, corsHeaders);
      }

      // Default route - return API info
      return new Response(JSON.stringify({
        message: 'Video Anywhere Box API - vid-just Worker',
        status: 'active',
        bucket: 'just-vids',
        binding: 'just-vids',
        publicUrl: 'https://pub-6b835e0399ff468abaeb2e4e04ce57c7.r2.dev',
        endpoints: {
          'GET /list-videos': 'List all videos in bucket',
          'POST /upload': 'Upload a video file',
          'GET /video/{key}': 'Get video by key',
          'DELETE /delete/{key}': 'Delete video by key'
        }
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });

    } catch (error) {
      console.error('Worker error:', error);
      return new Response(JSON.stringify({
        error: 'Internal server error',
        message: error.message
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  },
};

// List all videos in the R2 bucket
async function listVideos(env, corsHeaders) {
  try {
    // Use the correct binding name: "just-vids"
    const bucket = env['just-vids']; // This matches your binding name
    
    if (!bucket) {
      console.error('R2 bucket not found. Available bindings:', Object.keys(env));
      throw new Error('R2 bucket not configured - check binding name');
    }

    console.log('Listing videos from R2 bucket: just-vids');
    const listResult = await bucket.list();
    console.log('Raw list result:', listResult);

    const videos = [];

    for (const object of listResult.objects) {
      // Use your public R2 URL
      const publicUrl = `https://pub-6b835e0399ff468abaeb2e4e04ce57c7.r2.dev/${object.key}`;
      videos.push({
        key: object.key,
        url: publicUrl,
        size: object.size,
        lastModified: object.uploaded.toISOString(),
        // Add thumbnail logic here if you have thumbnails
        thumbnail: `https://pub-6b835e0399ff468abaeb2e4e04ce57c7.r2.dev/thumbnails/${object.key.replace(/\.[^/.]+$/, "")}.jpg`
      });
    }

    console.log('Processed videos:', videos);
    return new Response(JSON.stringify({ videos }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error listing videos:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      availableBindings: Object.keys(env || {})
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

// Upload video to R2 bucket
async function uploadVideo(request, env, corsHeaders) {
  try {
    const bucket = env['just-vids']; // Use correct binding name

    if (!bucket) {
      throw new Error('R2 bucket not configured - check binding name');
    }

    const formData = await request.formData();
    const file = formData.get('file');

    if (!file) {
      return new Response(JSON.stringify({ error: 'No file uploaded' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Basic file type validation
    if (!file.type.startsWith('video/')) {
      return new Response(JSON.stringify({ error: 'Only video files are allowed' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const key = file.name;
    await bucket.put(key, file.stream(), {
      httpMetadata: { contentType: file.type },
    });

    const publicUrl = `https://pub-6b835e0399ff468abaeb2e4e04ce57c7.r2.dev/${key}`;
    return new Response(JSON.stringify({ 
      message: `File ${key} uploaded successfully`, 
      url: publicUrl 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error uploading video:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

// Get a specific video from R2 bucket
async function getVideo(key, env, corsHeaders) {
  try {
    const bucket = env['just-vids']; // Use correct binding name

    if (!bucket) {
      throw new Error('R2 bucket not configured - check binding name');
    }

    const object = await bucket.get(key);

    if (!object) {
      return new Response('Video Not Found', { status: 404, headers: corsHeaders });
    }

    const headers = new Headers(corsHeaders);
    object.writeHttpMetadata(headers);
    headers.set('ETag', object.httpEtag);

    // Handle Range requests for video streaming
    const range = request.headers.get('range');
    if (range) {
      const { size } = object;
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : size - 1;
      const chunksize = (end - start) + 1;

      headers.set('Content-Range', `bytes ${start}-${end}/${size}`);
      headers.set('Accept-Ranges', 'bytes');
      headers.set('Content-Length', chunksize.toString());
      headers.set('Content-Type', object.httpMetadata.contentType || 'application/octet-stream');

      return new Response(object.body, {
        status: 206, // Partial Content
        headers: headers
      });
    }

    return new Response(object.body, {
      headers: headers,
    });
  } catch (error) {
    console.error('Error getting video:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

// Upload thumbnail for a video
async function uploadThumbnail(request, env, corsHeaders) {
  try {
    const bucket = env['just-vids']; // Use correct binding name

    if (!bucket) {
      throw new Error('R2 bucket not configured - check binding name');
    }

    const formData = await request.formData();
    const file = formData.get('file');
    const videoKey = formData.get('videoKey');

    if (!file) {
      return new Response(JSON.stringify({ error: 'No thumbnail file uploaded' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (!videoKey) {
      return new Response(JSON.stringify({ error: 'No video key provided' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Basic file type validation for images
    if (!file.type.startsWith('image/')) {
      return new Response(JSON.stringify({ error: 'Only image files are allowed for thumbnails' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Create thumbnail key based on video key
    const thumbnailKey = `thumbnails/${videoKey.replace(/\.[^/.]+$/, "")}.jpg`;
    
    await bucket.put(thumbnailKey, file.stream(), {
      httpMetadata: { contentType: file.type },
    });

    const publicUrl = `https://pub-6b835e0399ff468abaeb2e4e04ce57c7.r2.dev/${thumbnailKey}`;
    return new Response(JSON.stringify({ 
      message: `Thumbnail for ${videoKey} uploaded successfully`, 
      thumbnailUrl: publicUrl,
      thumbnailKey: thumbnailKey
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error uploading thumbnail:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

// Delete video from R2 bucket
async function deleteVideo(key, env, corsHeaders) {
  try {
    const bucket = env['just-vids']; // Use correct binding name

    if (!bucket) {
      throw new Error('R2 bucket not configured - check binding name');
    }

    await bucket.delete(key);
    return new Response(JSON.stringify({ message: `File ${key} deleted successfully` }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error deleting video:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}