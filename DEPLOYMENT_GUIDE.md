# Deployment Guide for vid-just Worker

## 🚀 Your Setup
- **Worker Name**: `vid-just`
- **R2 Bucket**: `vids`
- **Binding Name**: `VIDEO_BUCKET`

## 📋 Deployment Steps

### 1. Get Your Cloudflare Account ID
1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Select your domain or go to the Workers & Pages section
3. Copy your **Account ID** from the right sidebar

### 2. Update wrangler.toml
Replace `your-cloudflare-account-id` in `wrangler.toml` with your actual Account ID:

```toml
[vars]
ACCOUNT_ID = "your-actual-account-id-here"
```

### 3. Install Wrangler CLI
```bash
npm install -g wrangler
```

### 4. Login to Cloudflare
```bash
wrangler login
```

### 5. Deploy Your Worker
```bash
wrangler deploy
```

### 6. Get Your Worker URL
After deployment, you'll get a URL like:
```
https://vid-just.your-subdomain.workers.dev
```

### 7. Configure CORS on Your R2 Bucket
1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Navigate to **R2 Object Storage** → **vids** bucket
3. Go to **Settings** → **CORS policy**
4. Add this configuration:

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

### 8. Test Your Setup
1. Open your Video Anywhere Box app
2. Go to the "Cloudflare R2 Bucket" tab
3. Enter your Worker URL: `https://vid-just.your-subdomain.workers.dev`
4. Click "Fetch Videos" to test the connection
5. Try uploading a video

## 🔧 API Endpoints

Your deployed worker will provide these endpoints:

- `GET https://vid-just.your-subdomain.workers.dev/list-videos` - List all videos
- `POST https://vid-just.your-subdomain.workers.dev/upload` - Upload a video
- `GET https://vid-just.your-subdomain.workers.dev/video/{key}` - Get video by key
- `DELETE https://vid-just.your-subdomain.workers.dev/delete/{key}` - Delete video

## 🐛 Troubleshooting

### Worker not connecting to bucket?
- Check that your `wrangler.toml` has the correct bucket name: `vids`
- Verify the binding name is `VIDEO_BUCKET`
- Make sure you've deployed the worker after updating the config

### CORS errors?
- Ensure CORS is configured on your `vids` R2 bucket
- Check that the CORS policy allows your domain

### Upload failing?
- Check the Worker logs in Cloudflare Dashboard
- Verify file size limits (R2 has generous limits)
- Ensure the file is a valid video format

### Videos not loading?
- Check that videos are in supported formats (mp4, webm, ogg, mov, avi)
- Verify the public URLs are accessible
- Check browser console for errors

## 📊 Monitoring

You can monitor your worker in the Cloudflare Dashboard:
1. Go to **Workers & Pages**
2. Click on **vid-just**
3. Check **Logs** tab for any errors
4. Monitor **Analytics** for usage stats

## 🔄 Updates

To update your worker:
1. Make changes to `cloudflare-worker.js`
2. Run `wrangler deploy` again
3. Changes will be live immediately

## 🎯 Next Steps

Once deployed:
1. Test the upload functionality
2. Generate HTML code snippets
3. Embed the video carousel on your website
4. Monitor usage and performance
