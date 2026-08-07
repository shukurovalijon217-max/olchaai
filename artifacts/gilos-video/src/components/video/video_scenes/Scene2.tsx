import { motion } from 'framer-motion';

export function Scene2() {
  return (
    <motion.div 
      className="absolute inset-0 z-10 flex items-center justify-between px-[10vw] pointer-events-none"
      initial={{ opacity: 0, x: -100 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 100, filter: 'blur(10px)' }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
    >
      {/* Text Content */}
      <div className="w-1/2 flex flex-col gap-6">
        <motion.div
          className="overflow-hidden"
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3, ease: 'easeOut' }}
        >
          <h1 className="text-[5vw] font-display font-bold leading-tight text-white drop-shadow-2xl">
            Reels. <br />
            <span className="text-gradient-cyan">Jonli Efir.</span>
          </h1>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, x: -40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, delay: 0.8, ease: 'easeOut' }}
        >
          <p className="text-2xl md:text-3xl font-sans text-muted-foreground border-l-4 border-secondary pl-4">
            Hammasi bitta platformada. <br />
            Sun'iy intellekt bilan kuchaytirilgan.
          </p>
        </motion.div>
      </div>

      {/* 3D Icon */}
      <div className="w-1/2 flex justify-center items-center relative">
        <motion.div
          className="absolute inset-0 bg-secondary/20 blur-[100px] rounded-full"
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 1.5, delay: 0.5 }}
        />
        <motion.img
          src={`${import.meta.env.BASE_URL}images/stream_icon.png`}
          alt="Stream Icon"
          className="w-[30vw] h-auto object-contain relative z-10 drop-shadow-[0_0_40px_rgba(0,255,255,0.4)]"
          initial={{ opacity: 0, scale: 0.5, rotateY: -90, y: 50 }}
          animate={{ opacity: 1, scale: 1, rotateY: 0, y: [0, -15, 0] }}
          transition={{ 
            opacity: { duration: 0.8, delay: 0.4 },
            scale: { duration: 0.8, delay: 0.4, type: 'spring' },
            rotateY: { duration: 1, delay: 0.4, ease: 'easeOut' },
            y: { duration: 4, repeat: Infinity, ease: 'easeInOut' }
          }}
        />
      </div>
    </motion.div>
  );
}
