# Video Anywhere Box

A clean, professional video management tool for Cloudflare R2 storage with HTML code generation.

## Features

- 🎬 **Video Management**: Upload, preview, and delete videos from your R2 bucket
- 🖼️ **Thumbnail Support**: Add custom thumbnails to your videos
- 📋 **Code Generation**: Generate embeddable HTML code for your videos
- 🚀 **Easy Deployment**: Ready for Netlify deployment

## Quick Start

1. **Deploy the Worker**: Copy the code from `worker.js` to your Cloudflare Worker
2. **Configure R2**: Bind your R2 bucket named `just-vids` to the worker
3. **Run the App**: 
   ```bash
   npm install
   npm run dev
   ```
4. **Enter Worker URL**: Use `https://your-worker.your-subdomain.workers.dev`

## Deployment

The app is ready for Netlify deployment. Just connect your GitHub repository and deploy!

## Worker Setup

Your Cloudflare Worker needs:
- R2 bucket binding named `just-vids`
- The code from `worker.js`

That's it! Clean, simple, and professional.