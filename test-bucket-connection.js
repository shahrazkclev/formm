// Test script to verify R2 bucket connection
// Run this in your Cloudflare Worker to test bucket connectivity

export default {
  async fetch(request, env, ctx) {
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 200, headers: corsHeaders });
    }

    try {
      // Test bucket connection
      const bucket = env.VIDEO_BUCKET;
      
      if (!bucket) {
        return new Response(JSON.stringify({
          error: 'Bucket not configured',
          binding: 'VIDEO_BUCKET not found'
        }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Try to list objects
      const listResult = await bucket.list();
      
      return new Response(JSON.stringify({
        success: true,
        message: 'Bucket connected successfully!',
        bucketName: 'vids',
        objectCount: listResult.objects.length,
        objects: listResult.objects.map(obj => ({
          key: obj.key,
          size: obj.size,
          uploaded: obj.uploaded
        }))
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });

    } catch (error) {
      return new Response(JSON.stringify({
        error: 'Bucket connection failed',
        message: error.message
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  }
};
