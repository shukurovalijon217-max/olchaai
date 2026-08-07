import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

export function Scene4() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), 1000);
    const t2 = setTimeout(() => setPhase(2), 2000);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  return (
    <motion.div 
      className="absolute inset-0 z-10 flex flex-col items-center justify-center pointer-events-none"
      initial={{ opacity: 0, rotateX: 90 }}
      animate={{ opacity: 1, rotateX: 0 }}
      exit={{ opacity: 0, scale: 0.8, filter: 'blur(20px)' }}
      transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
      style={{ perspective: 1000 }}
    >
      <div className="flex flex-col items-center text-center gap-4">
        <motion.div
          className="overflow-hidden"
          animate={phase >= 0 ? { opacity: 1, y: 0 } : { opacity: 0, y: 40 }}
          initial={{ opacity: 0, y: 40 }}
          transition={{ duration: 0.8, ease: 'circOut' }}
        >
          <h2 className="text-[4vw] font-display font-bold text-white/80">
            Musiqa. Do'stlar.
          </h2>
        </motion.div>

        <motion.div
          animate={phase >= 1 ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.5 }}
          initial={{ opacity: 0, scale: 0.5 }}
          transition={{ duration: 0.8, type: 'spring', bounce: 0.4 }}
        >
          <h2 className="text-[4vw] font-display font-bold text-white/80">
            Chegarasiz Imkoniyatlar.
          </h2>
        </motion.div>

        <motion.div
          className="mt-8"
          animate={phase >= 2 ? { opacity: 1, scale: 1, filter: 'blur(0px)' } : { opacity: 0, scale: 2, filter: 'blur(20px)' }}
          initial={{ opacity: 0, scale: 2, filter: 'blur(20px)' }}
          transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
        >
          <h1 className="text-[8vw] font-display font-bold text-gradient-neon uppercase tracking-tighter drop-shadow-[0_0_30px_rgba(255,0,150,0.6)]">
            Cheksizlik
          </h1>
        </motion.div>
      </div>
      
      {/* Surrounding concentric circles */}
      <motion.div 
        className="absolute inset-0 flex items-center justify-center -z-10"
        animate={phase >= 2 ? { opacity: 1 } : { opacity: 0 }}
        transition={{ duration: 1 }}
      >
        {[1, 2, 3].map((i) => (
          <motion.div
            key={i}
            className="absolute rounded-full border border-primary/20"
            style={{ width: `${i * 30}vw`, height: `${i * 30}vw` }}
            animate={{ 
              rotate: 360,
              scale: [1, 1.05, 1]
            }}
            transition={{ 
              rotate: { duration: 20 * i, repeat: Infinity, ease: 'linear' },
              scale: { duration: 4, repeat: Infinity, ease: 'easeInOut', delay: i }
            }}
          />
        ))}
      </motion.div>
    </motion.div>
  );
}
