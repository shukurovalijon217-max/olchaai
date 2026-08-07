import { motion } from 'framer-motion';

export function Scene5() {
  return (
    <motion.div 
      className="absolute inset-0 z-10 flex flex-col items-center justify-center pointer-events-none bg-background/40 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 1 }}
    >
      <motion.div
        className="flex flex-col items-center gap-10"
        initial={{ scale: 0.8, y: 50 }}
        animate={{ scale: 1, y: 0 }}
        transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
      >
        {/* Main Logo Reveal */}
        <motion.div 
          className="relative"
          initial={{ opacity: 0, scale: 0.5, filter: 'blur(20px)' }}
          animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
          transition={{ duration: 1.5, ease: 'easeOut' }}
        >
          <div className="absolute inset-0 bg-primary/20 blur-[60px] rounded-full scale-150" />
          <h1 className="text-[12vw] font-display font-bold text-white tracking-widest relative z-10 drop-shadow-[0_0_20px_rgba(255,255,255,0.5)]">
            GILOS
          </h1>
        </motion.div>

        {/* Call to action text */}
        <motion.div
          className="text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.8 }}
        >
          <p className="text-2xl md:text-3xl font-sans text-muted-foreground uppercase tracking-widest mb-4">
            Hozir Yuklab Oling
          </p>
          <div className="inline-block px-8 py-4 bg-white text-black rounded-full font-sans font-bold text-2xl md:text-3xl shadow-[0_0_40px_rgba(255,255,255,0.3)]">
            olchaai.com
          </div>
        </motion.div>
      </motion.div>
      
      {/* Light sweep effect */}
      <motion.div
        className="absolute top-0 bottom-0 w-32 bg-white/10 skew-x-[30deg] blur-xl"
        initial={{ x: '-100vw' }}
        animate={{ x: '100vw' }}
        transition={{ duration: 1.5, delay: 1.5, ease: 'easeInOut' }}
      />
    </motion.div>
  );
}
