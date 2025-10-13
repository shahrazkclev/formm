# Video Anywhere Box - Setup Guide

## 🚀 Quick Setup for Cloudflare R2 Integration

### Step 1: Create Cloudflare R2 Bucket

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Navigate to **R2 Object Storage**
3. Click **"Create bucket"**
4. Name your bucket (e.g., `my-video-bucket`)
5. Choose a location close to your users
6. Click **"Create bucket"**

### Step 2: Configure CORS for Your Bucket

1. In your R2 bucket, go to **Settings** → **CORS policy**
2. Add this CORS configuration:

```json
[
  {
    "AllowedOrigins": ["*"],
    "AllowedMethods": ["GET", "HEAD"],
    "AllowedHeaders": ["Range", "Content-Type"],
    "MaxAgeSeconds": 3600
  }
]
```

### Step 3: Deploy Cloudflare Worker

1. Install Wrangler CLI:
```bash
npm install -g wrangler
```

2. Login to Cloudflare:
```bash
wrangler login
```

3. Update `wrangler.toml` with your details:
```toml
name = "video-anywhere-worker"
main = "cloudflare-worker.js"
compatibility_date = "2024-01-01"

[[r2_buckets]]
binding = "VIDEO_BUCKET"
bucket_name = "your-actual-bucket-name"
preview_bucket_name = "your-actual-bucket-name-preview"

[vars]
ACCOUNT_ID = "your-cloudflare-account-id"
```

4. Deploy the worker:
```bash
wrangler deploy
```

### Step 4: Get Your Worker URL

After deployment, you'll get a URL like:
```
https://video-anywhere-worker.your-subdomain.workers.dev
```

### Step 5: Use in Video Anywhere Box

1. Open the **"Cloudflare R2 Bucket"** tab
2. Enter your Worker URL in the **"Bucket URL"** field
3. Click **"Fetch Videos"** to load existing videos
4. Upload new videos using the upload interface
5. Customize your player settings
6. Copy the generated HTML code

## 🎯 Generated Code Features

The generated HTML code includes:

- **Responsive video player** with custom dimensions
- **Navigation arrows** for multiple videos
- **Video counter** showing current position
- **Keyboard navigation** (arrow keys)
- **Custom styling** with your chosen theme
- **Autoplay, mute, loop** options
- **Mobile-friendly** with `playsinline`

## 🔧 Customization Options

- **Size**: Width and height sliders
- **Theme**: Dark or light background
- **Controls**: Show/hide video controls
- **Navigation**: Show/hide arrows and counter
- **Behavior**: Autoplay, mute, loop settings
- **Styling**: Border radius customization

## 📱 Usage on Your Website

1. Copy the generated HTML code
2. Paste it into your website's HTML
3. The video carousel will automatically load and work
4. No additional JavaScript libraries required

## 🛠️ API Endpoints

Your deployed worker provides these endpoints:

- `GET /list-videos` - List all videos in bucket
- `POST /upload` - Upload a new video
- `GET /video/{key}` - Get video by key
- `DELETE /delete/{key}` - Delete video by key

## 🔒 Security Notes

- The worker includes CORS headers for web access
- Videos are served with proper cache headers
- File uploads are validated for video types only
- Consider adding authentication for production use

## 🆘 Troubleshooting

### Videos not loading?
- Check CORS configuration on your R2 bucket
- Verify your Worker URL is correct
- Ensure videos are in supported formats (mp4, webm, ogg, mov, avi)

### Upload failing?
- Check file size limits (R2 has generous limits)
- Ensure file is a valid video format
- Verify Worker has proper R2 bucket permissions

### Code not working on website?
- Check browser console for errors
- Ensure your website supports the video formats
- Verify the generated URLs are accessible

## 📞 Support

For issues or questions:
1. Check the browser console for error messages
2. Verify all setup steps were completed
3. Test with a simple video file first
4. Check Cloudflare Worker logs in the dashboard
