import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { logger } from '@/utils/logger';

export default function NotFound() {
  useEffect(() => {
    logger.warn('404 Not Found', {
      component: 'NotFound',
      path: window.location.pathname,
    });
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background text-foreground">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">404</h1>
        <p className="text-xl text-gray-600 mb-4">Oops! Page not found</p>
        <Link to="/" className="text-blue-500 hover:text-blue-700 underline">
          Return to Home
        </Link>
      </div>
    </div>
  );
};
