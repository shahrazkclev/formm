// Test script to check your bucket API
// Run this in browser console to test your bucket

const workerUrl = 'https://vid-just.cleverpoly-store.workers.dev';

async function testBucketAPI() {
  console.log('Testing bucket API...');
  
  try {
    // Test 1: Check if worker responds
    const response = await fetch(`${workerUrl}/list-videos`);
    console.log('Response status:', response.status);
    
    if (response.ok) {
      const data = await response.json();
      console.log('API Response:', data);
      
      if (data.videos && data.videos.length > 0) {
        console.log('✅ Bucket has videos:', data.videos.length);
        data.videos.forEach((video, index) => {
          console.log(`Video ${index + 1}:`, video.key, `(${(video.size / 1024 / 1024).toFixed(2)} MB)`);
        });
      } else {
        console.log('⚠️ Bucket is empty - no videos found');
        console.log('This is why the app shows "Not Connected"');
      }
    } else {
      console.log('❌ Worker not responding properly');
    }
  } catch (error) {
    console.log('❌ Error:', error.message);
  }
}

// Run the test
testBucketAPI();
