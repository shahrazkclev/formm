// Simple script to generate placeholder thumbnails for your videos
// This creates basic thumbnail URLs that you can use

const videos = [
  {
    key: "media-1757784683205-ryo3tsrq.mp4",
    url: "https://pub-6b835e0399ff468abaeb2e4e04ce57c7.r2.dev/media-1757784683205-ryo3tsrq.mp4"
  },
  {
    key: "reel2(1).mp4", 
    url: "https://pub-6b835e0399ff468abaeb2e4e04ce57c7.r2.dev/reel2(1).mp4"
  }
];

console.log("Your videos:");
videos.forEach((video, index) => {
  console.log(`${index + 1}. ${video.key}`);
  console.log(`   Video URL: ${video.url}`);
  console.log(`   Thumbnail URL: https://pub-6b835e0399ff468abaeb2e4e04ce57c7.r2.dev/thumbnails/${video.key.replace(/\.[^/.]+$/, "")}.jpg`);
  console.log("");
});

console.log("To add thumbnails:");
console.log("1. Deploy the updated worker code (corrected-worker.js)");
console.log("2. Use the 'Quick Thumbnail Upload' section in your app");
console.log("3. Upload JPG/PNG images for each video");
console.log("4. Thumbnails will be stored in the 'thumbnails/' folder in your R2 bucket");
