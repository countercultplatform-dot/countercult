import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

export function Globe() {
  const [rotation, setRotation] = useState(0);

  useEffect(() => {
    let animationFrameId: number;
    let lastTime = performance.now();

    const animate = (currentTime: number) => {
      const deltaTime = currentTime - lastTime;
      setRotation((prev) => (prev + deltaTime * 0.02) % 360);
      lastTime = currentTime;
      animationFrameId = requestAnimationFrame(animate);
    };

    animationFrameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrameId);
  }, []);

  return (
    <div className="relative w-full aspect-square max-w-md mx-auto flex items-center justify-center overflow-hidden">
      <svg
        viewBox="0 0 100 100"
        className="w-full h-full stroke-current text-foreground"
        fill="none"
        strokeWidth="0.5"
        vectorEffect="non-scaling-stroke"
      >
        {/* Outer Circle */}
        <circle cx="50" cy="50" r="48" />
        
        <g style={{ transform: `rotate(${rotation}deg)`, transformOrigin: '50px 50px' }}>
          {/* Latitudes */}
          <ellipse cx="50" cy="50" rx="48" ry="12" />
          <ellipse cx="50" cy="50" rx="48" ry="24" />
          <ellipse cx="50" cy="50" rx="48" ry="36" />
          
          {/* Longitudes */}
          <ellipse cx="50" cy="50" rx="12" ry="48" />
          <ellipse cx="50" cy="50" rx="24" ry="48" />
          <ellipse cx="50" cy="50" rx="36" ry="48" />
        </g>
        
        {/* Equator and Prime Meridian fixed */}
        <line x1="2" y1="50" x2="98" y2="50" />
        <line x1="50" y1="2" x2="50" y2="98" />
      </svg>
      
      {/* Glitch Overlay Effect */}
      <motion.div 
        className="absolute inset-0 bg-accent mix-blend-screen opacity-0"
        animate={{ 
          opacity: [0, 0.2, 0, 0.5, 0],
          clipPath: [
            "inset(20% 0 80% 0)",
            "inset(60% 0 10% 0)",
            "inset(40% 0 50% 0)",
            "inset(10% 0 80% 0)",
            "inset(80% 0 10% 0)"
          ]
        }}
        transition={{ 
          repeat: Infinity, 
          duration: 3,
          repeatDelay: 2
        }}
      />
    </div>
  );
}
