// Cloudflare Worker for Session Management

// Deploy this to Cloudflare Workers


export default {

    async fetch(request, env) {
    
    const url = new URL(request.url);
    
    const corsHeaders = {
    
    'Access-Control-Allow-Origin': '*',
    
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
    
    'Access-Control-Allow-Credentials': 'true',
    
    'Access-Control-Max-Age': '86400',
    
    };
    
    
    // Handle CORS preflight
    
    if (request.method === 'OPTIONS') {
    
    return new Response(null, { headers: corsHeaders });
    
    }
    
    
    // Save session endpoint
    
    if (url.pathname === '/api/sessions' && request.method === 'POST') {
    
    try {
    
    const { sessionId, email, turnstileToken, productName } = await request.json();
    
    if (!sessionId || !email || !turnstileToken || !productName) {
    
    return new Response(JSON.stringify({ error: 'Missing required fields' }), {
    
    status: 400,
    
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    
    });
    
    }
    
    
    // Additional validation
    
    if (email.trim() === '' || productName.trim() === '') {
    
    return new Response(JSON.stringify({ error: 'Email and product name cannot be empty' }), {
    
    status: 400,
    
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    
    });
    
    }
    
    
    // Verify Turnstile token with Cloudflare
    
    console.log('=== TURNSTILE VERIFICATION DEBUG ===');
    
    console.log('Turnstile token length:', turnstileToken.length);
    
    console.log('Turnstile secret exists:', !!env.TURNSTILE_SECRET);
    
    console.log('Turnstile secret length:', env.TURNSTILE_SECRET ? env.TURNSTILE_SECRET.length : 0);
    
    const turnstileResponse = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    
    method: 'POST',
    
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    
    body: `secret=${env.TURNSTILE_SECRET}&response=${turnstileToken}`
    
    });
    
    console.log('Turnstile API response status:', turnstileResponse.status);
    
    const turnstileResult = await turnstileResponse.json();
    
    console.log('Turnstile API response:', turnstileResult);
    
    if (!turnstileResult.success) {
    
    console.log('❌ Turnstile verification failed:', turnstileResult);
    
    return new Response(JSON.stringify({ error: 'Invalid verification', details: turnstileResult }), {
    
    status: 400,
    
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    
    });
    
    }
    
    console.log('✅ Turnstile verification successful');
    
    console.log('=== END TURNSTILE VERIFICATION DEBUG ===');
    
    
    // Save to KV with 15-minute TTL (900 seconds)
    
    await env.SESSIONS.put(sessionId, JSON.stringify({
    
    email,
    
    turnstileToken,
    
    timestamp: Date.now()
    
    }), { expirationTtl: 900 });
    
    // Trigger webhook automatically (only if all data is valid)
    
    const webhookPayload = {
    
    email: email.trim(),
    
    timestamp: new Date().toISOString(),
    
    product: productName.trim(),
    
    sessionId: sessionId
    
    };
    
    console.log('=== WEBHOOK DEBUG ===');
    
    console.log('Sending webhook with payload:', webhookPayload);
    
    console.log('Webhook URL:', env.WEBHOOK_URL);
    
    console.log('Environment check - TURNSTILE_SECRET exists:', !!env.TURNSTILE_SECRET);
    
    console.log('Environment check - WEBHOOK_URL exists:', !!env.WEBHOOK_URL);
    
    // Try to call webhook and log everything
    
    try {
    
    console.log('Attempting webhook call...');
    
    const webhookResponse = await fetch(env.WEBHOOK_URL, {
    
    method: 'POST',
    
    headers: { 'Content-Type': 'application/json' },
    
    body: JSON.stringify(webhookPayload)
    
    });
    
    console.log('Webhook response status:', webhookResponse.status);
    
    const webhookText = await webhookResponse.text();
    
    console.log('Webhook response body:', webhookText);
    
    if (webhookResponse.ok) {
    
    console.log('✅ Webhook call successful!');
    
    } else {
    
    console.log('❌ Webhook call failed with status:', webhookResponse.status);
    
    }
    
    } catch (webhookError) {
    
    console.error('❌ Webhook call error:', webhookError);
    
    }
    
    console.log('=== END WEBHOOK DEBUG ===');
    
    return new Response(JSON.stringify({ success: true }), {
    
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    
    });
    
    } catch (error) {
    
    return new Response(JSON.stringify({ error: 'Failed to save session' }), {
    
    status: 500,
    
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    
    });
    
    }
    
    }
    
    
    // Verify session endpoint
    
    if (url.pathname === '/api/verify' && request.method === 'GET') {
    
    try {
    
    const sessionId = url.searchParams.get('sessionId');
    
    if (!sessionId) {
    
    return new Response(JSON.stringify({ valid: false, error: 'Missing sessionId' }), {
    
    status: 400,
    
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    
    });
    
    }
    
    
    const email = await env.SESSIONS.get(sessionId);
    
    if (email) {
    
    // One-time use: delete after verification
    
    await env.SESSIONS.delete(sessionId);
    
    return new Response(JSON.stringify({ valid: true, email }), {
    
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    
    });
    
    }
    
    return new Response(JSON.stringify({ valid: false }), {
    
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    
    });
    
    } catch (error) {
    
    return new Response(JSON.stringify({ valid: false, error: 'Verification failed' }), {
    
    status: 500,
    
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    
    });
    
    }
    
    }
    
    
    // Health check
    
    if (url.pathname === '/health') {
    
    return new Response(JSON.stringify({ status: 'ok' }), {
    
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    
    });
    
    }
    
    
    return new Response('Not Found', { status: 404 });
    
    }
    
    };