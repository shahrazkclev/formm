// Video Anywhere Box - Cloudflare Worker
// Clean, production-ready worker for R2 video management

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    // CORS headers
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
      // Route: List videos
      if (path === '/list-videos' && method === 'GET') {
        return await listVideos(env, corsHeaders);
      }

      // Route: Upload video
      if (path === '/upload' && method === 'POST') {
        return await uploadVideo(request, env, corsHeaders);
      }

      // Route: Upload thumbnail
      if (path === '/upload-thumbnail' && method === 'POST') {
        return await uploadThumbnail(request, env, corsHeaders);
      }

      // Route: Get video
      if (path.startsWith('/video/') && method === 'GET') {
        const videoKey = path.replace('/video/', '');
        return await getVideo(videoKey, env, corsHeaders);
      }

      // Route: Delete video
      if (path.startsWith('/delete/') && method === 'DELETE') {
        const videoKey = path.replace('/delete/', '');
        return await deleteVideo(videoKey, env, corsHeaders);
      }

      // Default route - API info
      return new Response(JSON.stringify({
        message: 'Video Anywhere Box API',
        status: 'active',
        bucket: 'just-vids',
        endpoints: {
          'GET /list-videos': 'List all videos',
          'POST /upload': 'Upload a video',
          'POST /upload-thumbnail': 'Upload a thumbnail',
          'GET /video/{key}': 'Get video by key',
          'DELETE /delete/{key}': 'Delete video by key'
        }
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });

    } catch (error) {
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

// List videos - ONLY video files, NO thumbnails
async function listVideos(env, corsHeaders) {
  try {
    const bucket = env['just-vids'];
    
    if (!bucket) {
      throw new Error('R2 bucket not configured');
    }

    const listResult = await bucket.list();
    const videos = [];

    for (const object of listResult.objects) {
      // ONLY process video files - skip thumbnails and ALL image files
      if (object.key.startsWith('thumbnails/') || 
          object.key.match(/\.(jpg|jpeg|png|gif|bmp|webp|svg|ico)$/i) ||
          !object.key.match(/\.(mp4|webm|ogg|avi|mov|mkv)$/i)) {
        continue;
      }
      
      const publicUrl = `https://pub-6b835e0399ff468abaeb2e4e04ce57c7.r2.dev/${object.key}`;
      const thumbnailKey = `thumbnails/${object.key.replace(/\.[^/.]+$/, "")}.jpg`;
      const thumbnailUrl = `https://pub-6b835e0399ff468abaeb2e4e04ce57c7.r2.dev/${thumbnailKey}`;
      
      // Check if thumbnail exists
      let hasThumbnail = false;
      try {
        const thumbnailCheck = await bucket.head(thumbnailKey);
        hasThumbnail = thumbnailCheck !== null;
      } catch (e) {
        hasThumbnail = false;
      }
      
      videos.push({
        key: object.key,
        url: publicUrl,
        size: object.size,
        lastModified: object.uploaded.toISOString(),
        thumbnail: hasThumbnail ? thumbnailUrl : undefined
      });
    }

    return new Response(JSON.stringify({ videos }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ 
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

// Upload video
async function uploadVideo(request, env, corsHeaders) {
  try {
    const bucket = env['just-vids'];

    if (!bucket) {
      throw new Error('R2 bucket not configured');
    }

    const formData = await request.formData();
    const file = formData.get('file');

    if (!file) {
      return new Response(JSON.stringify({ error: 'No file uploaded' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

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
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

// Upload thumbnail
async function uploadThumbnail(request, env, corsHeaders) {
  try {
    const bucket = env['just-vids'];

    if (!bucket) {
      throw new Error('R2 bucket not configured');
    }

    const formData = await request.formData();
    const file = formData.get('file');
    const videoKey = formData.get('videoKey');

    if (!file || !videoKey) {
      return new Response(JSON.stringify({ error: 'Missing file or video key' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (!file.type.startsWith('image/')) {
      return new Response(JSON.stringify({ error: 'Only image files are allowed' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const thumbnailKey = `thumbnails/${videoKey.replace(/\.[^/.]+$/, "")}.jpg`;
    
    await bucket.put(thumbnailKey, file.stream(), {
      httpMetadata: { contentType: file.type },
    });

    const thumbnailUrl = `https://pub-6b835e0399ff468abaeb2e4e04ce57c7.r2.dev/${thumbnailKey}`;
    return new Response(JSON.stringify({ 
      message: `Thumbnail for ${videoKey} uploaded successfully`, 
      thumbnailUrl: thumbnailUrl
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

// Get video
async function getVideo(key, env, corsHeaders) {
  try {
    const bucket = env['just-vids'];

    if (!bucket) {
      throw new Error('R2 bucket not configured');
    }

    const object = await bucket.get(key);

    if (!object) {
      return new Response('Video Not Found', { status: 404, headers: corsHeaders });
    }

    const headers = new Headers(corsHeaders);
    object.writeHttpMetadata(headers);
    headers.set('ETag', object.httpEtag);

    return new Response(object.body, {
      headers: headers,
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

// Delete video
async function deleteVideo(key, env, corsHeaders) {
  try {
    const bucket = env['just-vids'];

    if (!bucket) {
      throw new Error('R2 bucket not configured');
    }

    await bucket.delete(key);
    return new Response(JSON.stringify({ message: `File ${key} deleted successfully` }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}
