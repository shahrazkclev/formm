// Cloudflare Worker for Video Anywhere Box
// Worker name: vid-just
// R2 Bucket: vids
// Deploy this to your Cloudflare Workers dashboard

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    // CORS headers for all responses
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    };

    // Handle preflight requests
    if (method === 'OPTIONS') {
      return new Response(null, { status: 200, headers: corsHeaders });
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
        message: 'Video Anywhere Box API',
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
    const bucket = env.VIDEO_BUCKET; // R2 bucket binding name: vids
    
    if (!bucket) {
      console.error('R2 bucket not configured - check your wrangler.toml binding');
      throw new Error('R2 bucket not configured');
    }

    console.log('Listing videos from R2 bucket: vids');

    const listResult = await bucket.list();
    const videos = [];

    for (const object of listResult.objects) {
      // Only include video files
      if (isVideoFile(object.key)) {
        videos.push({
          key: object.key,
          url: `https://pub-${env.ACCOUNT_ID}.r2.dev/${object.key}`, // Public URL
          size: object.size,
          lastModified: object.uploaded.toISOString(),
          etag: object.etag
        });
      }
    }

    return new Response(JSON.stringify({
      success: true,
      videos: videos,
      count: videos.length
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

// Upload video to R2 bucket
async function uploadVideo(request, env, corsHeaders) {
  try {
    const bucket = env.VIDEO_BUCKET; // R2 bucket binding name: vids
    
    if (!bucket) {
      console.error('R2 bucket not configured - check your wrangler.toml binding');
      throw new Error('R2 bucket not configured');
    }

    console.log('Uploading video to R2 bucket: vids');

    const formData = await request.formData();
    const file = formData.get('file');

    if (!file) {
      return new Response(JSON.stringify({
        success: false,
        error: 'No file provided'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Validate file type
    if (!isVideoFile(file.name)) {
      return new Response(JSON.stringify({
        success: false,
        error: 'File must be a video (mp4, webm, ogg, mov, avi)'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Generate unique filename
    const timestamp = Date.now();
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const key = `videos/${timestamp}_${sanitizedName}`;

    // Upload to R2
    await bucket.put(key, file.stream(), {
      httpMetadata: {
        contentType: file.type,
        cacheControl: 'public, max-age=31536000', // Cache for 1 year
      },
      customMetadata: {
        originalName: file.name,
        uploadedAt: new Date().toISOString(),
        size: file.size.toString()
      }
    });

    const publicUrl = `https://pub-${env.ACCOUNT_ID}.r2.dev/${key}`;

    return new Response(JSON.stringify({
      success: true,
      message: 'Video uploaded successfully',
      key: key,
      url: publicUrl,
      size: file.size
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

// Get video by key
async function getVideo(videoKey, env, corsHeaders) {
  try {
    const bucket = env.VIDEO_BUCKET;
    
    if (!bucket) {
      throw new Error('R2 bucket not configured');
    }

    const object = await bucket.get(videoKey);
    
    if (!object) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Video not found'
      }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Return video with proper headers for streaming
    return new Response(object.body, {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': object.httpMetadata?.contentType || 'video/mp4',
        'Content-Length': object.size.toString(),
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'public, max-age=31536000',
        'ETag': object.etag
      }
    });

  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

// Delete video by key
async function deleteVideo(videoKey, env, corsHeaders) {
  try {
    const bucket = env.VIDEO_BUCKET;
    
    if (!bucket) {
      throw new Error('R2 bucket not configured');
    }

    await bucket.delete(videoKey);

    return new Response(JSON.stringify({
      success: true,
      message: 'Video deleted successfully'
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

// Helper function to check if file is a video
function isVideoFile(filename) {
  const videoExtensions = ['.mp4', '.webm', '.ogg', '.mov', '.avi', '.mkv', '.flv', '.wmv'];
  const extension = filename.toLowerCase().substring(filename.lastIndexOf('.'));
  return videoExtensions.includes(extension);
}

// Wrangler configuration (add this to wrangler.toml)
/*
name = "video-anywhere-worker"
main = "cloudflare-worker.js"
compatibility_date = "2024-01-01"

[[r2_buckets]]
binding = "VIDEO_BUCKET"
bucket_name = "your-video-bucket-name"
preview_bucket_name = "your-video-bucket-name-preview"

[vars]
ACCOUNT_ID = "your-cloudflare-account-id"
*/
