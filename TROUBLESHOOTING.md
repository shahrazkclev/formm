# 🔧 Troubleshooting: Unable to Fetch Videos from Bucket

## 🚨 Common Issues & Solutions

### 1. **Worker Not Deployed**
**Symptoms:** "Cannot connect to your Cloudflare Worker" error

**Solutions:**
- ✅ Deploy your worker: `wrangler deploy`
- ✅ Check your Worker URL is correct
- ✅ Verify the worker is active in Cloudflare Dashboard

### 2. **Wrong Worker URL**
**Symptoms:** 404 errors or connection failures

**Solutions:**
- ✅ Your Worker URL should be: `https://vid-just.your-subdomain.workers.dev`
- ✅ Make sure there's no trailing slash
- ✅ Test the URL directly in your browser

### 3. **R2 Bucket Not Bound**
**Symptoms:** "R2 bucket not configured" error in worker logs

**Solutions:**
- ✅ Check `wrangler.toml` has correct bucket name: `vids`
- ✅ Verify binding name: `VIDEO_BUCKET`
- ✅ Redeploy after updating config: `wrangler deploy`

### 4. **CORS Issues**
**Symptoms:** CORS errors in browser console

**Solutions:**
- ✅ Configure CORS on your `vids` R2 bucket:
```json
[
  {
    "AllowedOrigins": ["*"],
    "AllowedMethods": ["GET", "HEAD", "POST", "PUT", "DELETE"],
    "AllowedHeaders": ["Range", "Content-Type", "Authorization"],
    "MaxAgeSeconds": 3600
  }
]
```

### 5. **Empty Bucket**
**Symptoms:** Worker responds but shows 0 videos

**Solutions:**
- ✅ Upload some videos to your `vids` bucket
- ✅ Check bucket permissions are set to public
- ✅ Verify videos are in supported formats (mp4, webm, ogg, mov, avi)

### 6. **Account ID Missing**
**Symptoms:** Worker deployment fails or bucket access denied

**Solutions:**
- ✅ Get your Account ID from Cloudflare Dashboard
- ✅ Update `wrangler.toml` with your Account ID
- ✅ Redeploy: `wrangler deploy`

## 🔍 Diagnostic Steps

### Step 1: Test Worker Directly
Open your Worker URL in browser:
```
https://vid-just.your-subdomain.workers.dev
```
You should see API information.

### Step 2: Test List Endpoint
```
https://vid-just.your-subdomain.workers.dev/list-videos
```
Should return JSON with videos array.

### Step 3: Check Worker Logs
1. Go to Cloudflare Dashboard
2. Workers & Pages → vid-just
3. Check Logs tab for errors

### Step 4: Verify R2 Bucket
1. Go to R2 Object Storage
2. Check `vids` bucket exists
3. Verify it has videos
4. Check CORS configuration

## 🛠️ Quick Fixes

### Fix 1: Redeploy Worker
```bash
wrangler deploy
```

### Fix 2: Update wrangler.toml
Make sure it has:
```toml
name = "vid-just"
bucket_name = "vids"
binding = "VIDEO_BUCKET"
ACCOUNT_ID = "your-actual-account-id"
```

### Fix 3: Test with Demo Mode
1. Enable "Demo Mode" in the app
2. Click "Fetch Videos"
3. This should work without a deployed worker

## 📞 Still Having Issues?

1. **Run Diagnostics**: Use the "🔍 Run Diagnostics" button in the app
2. **Check Browser Console**: Look for error messages
3. **Verify Worker Logs**: Check Cloudflare Dashboard
4. **Test Manually**: Try the Worker URL directly in browser

## 🎯 Expected Working Setup

When everything is working:
- ✅ Worker deployed and accessible
- ✅ R2 bucket `vids` exists and has videos
- ✅ CORS configured on bucket
- ✅ Worker bound to bucket correctly
- ✅ App can fetch videos successfully
