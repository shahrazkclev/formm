# 🚀 Netlify Deployment Guide

## Quick Deploy to Netlify

### Option 1: Deploy from GitHub (Recommended)

1. **Push to GitHub** (if not already done):
   ```bash
   git add .
   git commit -m "Ready for Netlify deployment"
   git push origin main
   ```

2. **Connect to Netlify**:
   - Go to [netlify.com](https://netlify.com)
   - Click "New site from Git"
   - Choose "GitHub" and select your repository
   - Netlify will auto-detect the settings:
     - **Build command**: `npm run build`
     - **Publish directory**: `dist`
   - Click "Deploy site"

### Option 2: Drag & Drop Deploy

1. **Build locally**:
   ```bash
   npm run build
   ```

2. **Deploy**:
   - Go to [netlify.com](https://netlify.com)
   - Drag the `dist` folder to the deploy area
   - Your site will be live instantly!

### Option 3: Netlify CLI

1. **Install Netlify CLI**:
   ```bash
   npm install -g netlify-cli
   ```

2. **Login and Deploy**:
   ```bash
   netlify login
   netlify deploy --prod --dir=dist
   ```

## 🎯 What's Configured

✅ **netlify.toml** - Build settings and redirects
✅ **_redirects** - SPA routing support  
✅ **_headers** - Security and caching headers
✅ **Build script** - `npm run build` creates optimized dist folder

## 🔧 Build Process

The build process:
1. **Installs dependencies**: `npm install`
2. **Builds the app**: `npm run build` (creates `dist` folder)
3. **Deploys**: Netlify serves from `dist` folder

## 📱 Features After Deployment

- ✅ **Responsive design** works on all devices
- ✅ **SPA routing** - all routes work correctly
- ✅ **Fast loading** - optimized assets with caching
- ✅ **Security headers** - XSS protection, frame options
- ✅ **Cloudflare R2 integration** - upload and manage videos
- ✅ **HTML code generation** - copy embeddable code

## 🌐 Custom Domain (Optional)

1. In Netlify dashboard, go to **Domain settings**
2. Click **Add custom domain**
3. Enter your domain name
4. Follow DNS configuration instructions

## 🔄 Auto-Deploy from GitHub

Once connected to GitHub:
- ✅ **Automatic deploys** on every push to main branch
- ✅ **Preview deploys** for pull requests
- ✅ **Build logs** and error notifications

## 🎉 Your Live Site

After deployment, you'll get a URL like:
```
https://your-site-name.netlify.app
```

Share this URL and users can:
- Upload videos to your Cloudflare R2 bucket
- Generate HTML code for their websites
- Create video carousels with custom settings

## 🛠️ Troubleshooting

### Build Fails?
- Check build logs in Netlify dashboard
- Ensure all dependencies are in `package.json`
- Verify Node.js version (set to 18 in netlify.toml)

### Site Not Loading?
- Check if `dist` folder was created
- Verify `_redirects` file is in `public` folder
- Check browser console for errors

### CORS Issues?
- Your Cloudflare Worker handles CORS
- Make sure Worker is deployed and accessible
- Test Worker URL directly in browser
