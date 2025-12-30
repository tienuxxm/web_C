import React from 'react';

const BackgroundEffects: React.FC = () => {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none">
     {/* Background Base Color: Cool Gray for Light, Deep Navy for Dark */}
      <div className="absolute inset-0 bg-bitex-neutral dark:bg-bitex-dark transition-colors duration-500"></div>

      {/* Noise Texture Overlay - Subtle texture */}
      <div className="absolute inset-0 bg-noise opacity-30 mix-blend-overlay"></div>

      {/* Brand Colored Blobs */}
      
      {/* Blob 1: Top Left - Navy Blue */}
      <div className="absolute top-0 -left-10 w-96 h-96 bg-blue-200/40 dark:bg-bitex-primary/30 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-[80px] opacity-50 animate-blob"></div>
      
      {/* Blob 2: Top Right - Deep Ocean */}
      <div className="absolute top-1/4 right-0 w-80 h-80 bg-blue-100/40 dark:bg-bitex-secondary/20 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-[80px] opacity-50 animate-blob animation-delay-2000"></div>
      
      {/* Blob 3: Bottom - REMOVED Red/Accent in Light Mode. Only visible in Dark Mode as subtle Navy */}
      <div className="absolute -bottom-10 left-1/3 w-72 h-72 bg-transparent dark:bg-bitex-primary/10 rounded-full mix-blend-screen filter blur-[80px] opacity-40 animate-blob animation-delay-4000"></div>

      {/* Grid Pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(0,84,166,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(0,84,166,0.03)_1px,transparent_1px)] dark:bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_at_center,black_60%,transparent_100%)]"></div>
    </div>
  );
};

export default BackgroundEffects;