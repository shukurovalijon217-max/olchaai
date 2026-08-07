import { motion } from 'framer-motion';

export function Scene3() {
  return (
    <motion.div 
      className="absolute inset-0 z-10 flex flex-col items-center justify-center pointer-events-none"
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 1.2, filter: 'blur(20px)' }}
      transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="relative w-full h-full flex flex-col items-center justify-center">
        {/* Avatars */}
        <motion.div 
          className="absolute inset-0 flex items-center justify-center"
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 1, delay: 0.2, ease: 'easeOut' }}
        >
          <motion.img
            src={`${import.meta.env.BASE_URL}images/avatars.png`}
            className="w-[45vw] h-auto object-contain opacity-90 drop-shadow-[0_0_50px_rgba(150,0,255,0.6)] mix-blend-screen"
            animate={{ 
              y: [-10, 10, -10],
              scale: [1, 1.02, 1]
            }}
            transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
          />
        </motion.div>

        {/* Text */}
        <motion.div
          className="absolute bottom-[20vh] text-center w-full px-10"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.8, ease: 'easeOut' }}
        >
          <h1 className="text-[4.5vw] font-display font-bold leading-tight text-white drop-shadow-[0_4px_20px_rgba(0,0,0,0.8)]">
            O'zbekistonning <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-primary">
              Raqamli Kelajagi
            </span>
          </h1>
          <motion.div
            className="mt-6 w-24 h-1 bg-primary mx-auto rounded-full"
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 1, delay: 1.2, ease: 'circOut' }}
          />
        </motion.div>
      </div>
    </motion.div>
  );
}
