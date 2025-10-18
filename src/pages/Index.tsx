import React from 'react';
import { Link } from 'react-router-dom';
import BucketManager from '../components/BucketManager';

export default function Index() {
  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <div className="fixed top-4 right-4 z-50">
        <Link
          to="/clean"
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-lg"
        >
          Clean Video Box
        </Link>
      </div>
      
      <BucketManager />
    </div>
  );
}