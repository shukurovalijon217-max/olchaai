import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

export function PersistentBackground({ currentScene }: { currentScene: number }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) return null;

  return (
    <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden bg-background">
      {/* Base Grid / Noise */}
      <div 
        className="absolute inset-0 opacity-[0.03]" 
        style={{ 
          backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.65%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E")',
        }} 
      />
      
      {/* Dynamic gradients reacting to scene */}
      <motion.div
        className="absolute inset-0 opacity-50"
        animate={{
          background: currentScene === 0 
            ? 'radial-gradient(circle at 50% 50%, rgba(255, 0, 150, 0.15) 0%, rgba(0,0,0,0) 70%)'
            : currentScene === 1 
            ? 'radial-gradient(circle at 80% 50%, rgba(0, 255, 255, 0.15) 0%, rgba(0,0,0,0) 70%)'
            : currentScene === 2
            ? 'radial-gradient(circle at 20% 80%, rgba(150, 0, 255, 0.15) 0%, rgba(0,0,0,0) 70%)'
            : currentScene === 3
            ? 'radial-gradient(circle at 50% 50%, rgba(0, 255, 255, 0.1) 0%, rgba(255, 0, 150, 0.1) 100%)'
            : 'radial-gradient(circle at 50% 10%, rgba(255, 0, 150, 0.2) 0%, rgba(0,0,0,0) 80%)'
        }}
        transition={{ duration: 1.5, ease: 'easeInOut' }}
      />

      {/* Video 1: Cyber City (Scenes 0, 2) */}
      <motion.video
        src={`${import.meta.env.BASE_URL}videos/cyber_city.mp4`}
        autoPlay
        loop
        muted
        playsInline
        className="absolute inset-0 w-full h-full object-cover"
        animate={{
          opacity: (currentScene === 0 || currentScene === 2) ? 0.4 : 0,
          scale: (currentScene === 0 || currentScene === 2) ? 1.05 : 1.15,
        }}
        transition={{ duration: 2, ease: 'easeInOut' }}
      />

      {/* Video 2: Holo Phone (Scene 1) */}
      <motion.video
        src={`${import.meta.env.BASE_URL}videos/holo_phone.mp4`}
        autoPlay
        loop
        muted
        playsInline
        className="absolute inset-0 w-full h-full object-cover"
        animate={{
          opacity: currentScene === 1 ? 0.5 : 0,
          scale: currentScene === 1 ? 1 : 1.1,
        }}
        transition={{ duration: 1.5, ease: 'easeInOut' }}
      />

      {/* Video 3: Neon Spheres (Scenes 3, 4) */}
      <motion.video
        src={`${import.meta.env.BASE_URL}videos/neon_spheres.mp4`}
        autoPlay
        loop
        muted
        playsInline
        className="absolute inset-0 w-full h-full object-cover"
        animate={{
          opacity: (currentScene === 3 || currentScene === 4) ? 0.6 : 0,
          scale: (currentScene === 3 || currentScene === 4) ? 1.05 : 1.2,
        }}
        transition={{ duration: 2, ease: 'easeInOut' }}
      />

      {/* Persistent Floating 3D Shapes midground */}
      <motion.img
        src={`${import.meta.env.BASE_URL}images/gilos_sphere.png`}
        className="absolute w-[20vw] h-auto max-w-[300px] object-contain drop-shadow-[0_0_30px_rgba(255,0,150,0.5)]"
        animate={{
          x: currentScene === 0 ? '-10vw' : currentScene === 1 ? '70vw' : currentScene === 2 ? '10vw' : currentScene === 3 ? '80vw' : '50vw',
          y: currentScene === 0 ? '10vh' : currentScene === 1 ? '60vh' : currentScene === 2 ? '20vh' : currentScene === 3 ? '10vh' : '50vh',
          scale: currentScene === 0 ? 0 : currentScene === 4 ? 0.3 : 1,
          rotate: currentScene * 45,
          opacity: currentScene === 4 ? 0 : 0.7,
        }}
        transition={{ duration: 2, ease: [0.16, 1, 0.3, 1] }}
      />
      
      {/* Dark Vignette Overlay */}
      <div className="absolute inset-0 bg-radial from-transparent to-background/80" />
    </div>
  );
}
