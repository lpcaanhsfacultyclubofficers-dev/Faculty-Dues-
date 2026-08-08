import React from 'react';
import { motion } from 'motion/react';

export const DesktopOceanBackground = () => {
  return (
    <div className="hidden md:block absolute inset-0 z-[1] overflow-hidden bg-[#000511] pointer-events-none">
      {/* Deep Water Base Gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#00173d] via-[#000a1f] to-[#00020a] opacity-90" />
      
      {/* Beautiful Abstract Mesh Glows / Aurora */}
      <motion.div
        animate={{ scale: [1, 1.2, 1], x: ['0%', '5%', '0%'], y: ['0%', '10%', '0%'] }}
        transition={{ duration: 25, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute -top-[20%] -left-[10%] w-[60%] h-[60%] rounded-full bg-[#0038A8] opacity-30 blur-[130px] mix-blend-screen"
      />
      <motion.div
        animate={{ scale: [1, 1.3, 1], x: ['0%', '-10%', '0%'], y: ['0%', '-5%', '0%'] }}
        transition={{ duration: 30, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
        className="absolute top-[20%] -right-[20%] w-[70%] h-[70%] rounded-full bg-[#00B4D8] opacity-25 blur-[160px] mix-blend-screen"
      />
      <motion.div
        animate={{ scale: [1.2, 1, 1.2], x: ['0%', '15%', '0%'], y: ['0%', '-15%', '0%'] }}
        transition={{ duration: 35, repeat: Infinity, ease: 'easeInOut', delay: 5 }}
        className="absolute -bottom-[20%] left-[20%] w-[70%] h-[70%] rounded-full bg-[#001c55] opacity-40 blur-[140px]"
      />
      {/* Added Aurora Lights */}
      <motion.div
        animate={{ scale: [1.1, 1.4, 1.1], x: ['0%', '20%', '0%'], y: ['0%', '10%', '0%'] }}
        transition={{ duration: 28, repeat: Infinity, ease: 'easeInOut', delay: 10 }}
        className="absolute top-[30%] left-[5%] w-[80%] h-[40%] rounded-[100%] bg-[#00A86B] opacity-25 blur-[150px] mix-blend-screen"
        style={{ transform: 'rotate(-15deg)' }}
      />
      <motion.div
        animate={{ scale: [0.9, 1.3, 0.9], x: ['0%', '-15%', '0%'], y: ['0%', '-10%', '0%'] }}
        transition={{ duration: 32, repeat: Infinity, ease: 'easeInOut', delay: 7 }}
        className="absolute bottom-[15%] right-[10%] w-[65%] h-[65%] rounded-full bg-[#9b5de5] opacity-20 blur-[140px] mix-blend-screen"
      />
      <motion.div
        animate={{ scale: [1, 1.5, 1], x: ['0%', '15%', '0%'], y: ['0%', '-10%', '0%'] }}
        transition={{ duration: 22, repeat: Infinity, ease: 'easeInOut', delay: 3 }}
        className="absolute top-[10%] left-[25%] w-[60%] h-[40%] rounded-[100%] bg-[#4bc0c8] opacity-30 blur-[120px] mix-blend-screen"
        style={{ transform: 'rotate(25deg)' }}
      />
      {/* Extra Vibrant Aurora Layers */}
      <motion.div
        animate={{ scale: [1.2, 0.9, 1.2], x: ['-10%', '10%', '-10%'], y: ['-5%', '15%', '-5%'] }}
        transition={{ duration: 26, repeat: Infinity, ease: 'easeInOut', delay: 4 }}
        className="absolute top-[45%] left-[15%] w-[70%] h-[35%] rounded-[100%] bg-[#00f5d4] opacity-20 blur-[130px] mix-blend-screen"
        style={{ transform: 'rotate(10deg)' }}
      />
      <motion.div
        animate={{ scale: [1, 1.4, 1], x: ['15%', '-15%', '15%'], y: ['10%', '-10%', '10%'] }}
        transition={{ duration: 24, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
        className="absolute top-[5%] right-[5%] w-[50%] h-[50%] rounded-full bg-[#7209b7] opacity-25 blur-[150px] mix-blend-screen"
      />

      {/* Elegant Slow-Moving Light Rays (Caustics / God Rays) */}
      <div className="absolute -top-[20%] left-0 right-0 h-[100vh] flex justify-center opacity-50 mix-blend-screen pointer-events-none">
        {/* Ray 1 */}
        <motion.div 
          animate={{ rotate: [-3, 3, -3], opacity: [0.1, 0.4, 0.1] }}
          transition={{ duration: 15, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute top-0 w-[30vw] h-full bg-gradient-to-b from-[#4bc0c8]/20 to-transparent blur-[40px] origin-top"
          style={{ transform: 'skewX(-20deg)' }}
        />
        {/* Ray 2 */}
        <motion.div 
          animate={{ rotate: [2, -2, 2], opacity: [0.2, 0.5, 0.2] }}
          transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut', delay: 3 }}
          className="absolute top-0 left-[10%] w-[40vw] h-full bg-gradient-to-b from-[#0038A8]/20 to-transparent blur-[50px] origin-top"
          style={{ transform: 'skewX(-10deg)' }}
        />
        {/* Ray 3 */}
        <motion.div 
          animate={{ rotate: [-2, 2, -2], opacity: [0.1, 0.3, 0.1] }}
          transition={{ duration: 20, repeat: Infinity, ease: 'easeInOut', delay: 7 }}
          className="absolute top-0 right-[15%] w-[35vw] h-full bg-gradient-to-b from-[#00B4D8]/20 to-transparent blur-[40px] origin-top"
          style={{ transform: 'skewX(15deg)' }}
        />
      </div>

      {/* Premium Noise Overlay for Cinematic Texture */}
      <div 
        className="absolute inset-0 opacity-[0.03] mix-blend-overlay pointer-events-none"
        style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noiseFilter\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.8\' numOctaves=\'3\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noiseFilter)\'/%3E%3C/svg%3E")' }}
      />

      {/* Subtle Ambient Particles (Bioluminescent Dust / Marine Snow) */}
      {[...Array(130)].map((_, i) => (
        <motion.div
            key={`snow-${i}`}
            initial={{ 
              y: `${Math.random() * 100}vh`, 
              x: `${Math.random() * 100}vw`, 
              opacity: Math.random() * 0.5,
            }}
            animate={{ 
                y: [`${Math.random() * 100 + 10}vh`, `-10vh`], 
                x: [`${Math.random() * 100}vw`, `${(Math.random() - 0.5) * 50 + 50}vw`], 
                opacity: [0, Math.random() * 0.7 + 0.2, 0],
            }}
            transition={{
                duration: Math.random() * 20 + 20,
                repeat: Infinity,
                delay: -Math.random() * 40, // Negative delay so it's already running smoothly
                ease: "linear"
            }}
            className="absolute rounded-full bg-white shadow-[0_0_8px_1px_rgba(255,255,255,0.4)]"
            style={{
                width: `${Math.random() * 3 + 1}px`,
                height: `${Math.random() * 3 + 1}px`,
                filter: `blur(${Math.random() * 1}px)`
            }}
        />
      ))}

      {/* Sweeping Aurora Stars (Horizontal Flow along the Aurora Lights) */}
      {[...Array(120)].map((_, i) => (
        <motion.div
            key={`aurora-star-${i}`}
            initial={{ 
              y: `${Math.random() * 70 + 5}vh`, // Concentrated in the upper/middle section where aurora flow is
              x: `-10vw`, 
              opacity: 0,
            }}
            animate={{ 
                y: [`${Math.random() * 70 + 5}vh`, `${(Math.random() * 70 + 5) + (Math.random() * 25 - 12)}vh`], 
                x: [`-10vw`, `110vw`], 
                opacity: [0, Math.random() * 0.9 + 0.3, 0],
            }}
            transition={{
                duration: Math.random() * 12 + 12, // Move across horizontally
                repeat: Infinity,
                delay: -Math.random() * 30,
                ease: "linear"
            }}
            className="absolute rounded-full bg-white shadow-[0_0_12px_2px_rgba(255,255,255,0.6)]"
            style={{
                width: `${Math.random() * 2.5 + 1.5}px`,
                height: `${Math.random() * 2.5 + 1.5}px`,
                filter: `blur(${Math.random() * 0.5}px)`
            }}
        />
      ))}

      {/* Large Out-Of-Focus Floating Orbs (Bokeh Depth Effect) */}
      {[...Array(10)].map((_, i) => (
        <motion.div
            key={`bokeh-${i}`}
            initial={{ 
              y: `${Math.random() * 100}vh`, 
              x: `${Math.random() * 100}vw`, 
            }}
            animate={{ 
                y: [`${Math.random() * 100 + 20}vh`, `-20vh`],
                x: [`${Math.random() * 100}vw`, `${Math.random() * 100}vw`],
                opacity: [0, Math.random() * 0.15 + 0.05, 0],
                scale: [1, Math.random() + 1, 1]
            }}
            transition={{
                duration: Math.random() * 30 + 30,
                repeat: Infinity,
                delay: -Math.random() * 50,
                ease: "easeInOut"
            }}
            className="absolute rounded-full bg-[#00B4D8] mix-blend-screen"
            style={{
                width: `${Math.random() * 200 + 100}px`,
                height: `${Math.random() * 200 + 100}px`,
                filter: 'blur(50px)' 
            }}
        />
      ))}
    </div>
  );
};
