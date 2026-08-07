import { motion } from 'framer-motion';

export function Scene1() {
  const letters = ['G', 'I', 'L', 'O', 'S'];

  return (
    <motion.div 
      className="absolute inset-0 z-10 flex flex-col items-center justify-center pointer-events-none"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.2, filter: 'blur(10px)' }}
      transition={{ duration: 0.8, ease: 'easeInOut' }}
    >
      <div className="flex flex-col items-center">
        <div className="flex gap-4 mb-8">
          {letters.map((letter, i) => (
            <motion.span
              key={i}
              className="text-[14vw] font-display font-bold leading-none text-transparent"
              style={{
                WebkitTextStroke: '3px hsl(320 100% 60%)',
                filter: 'drop-shadow(0 0 25px hsl(320 100% 60%))'
              }}
              initial={{ opacity: 0, y: 50, rotateX: -90 }}
              animate={{ 
                opacity: [0, 1, 1], 
                y: 0, 
                rotateX: 0,
                color: ['rgba(255,20,147,0)', 'rgba(255,20,147,0)', 'hsl(320 100% 60%)']
              }}
              transition={{
                duration: 1.5,
                delay: 0.2 + i * 0.15,
                type: "spring",
                stiffness: 100,
                damping: 12
              }}
            >
              {letter}
            </motion.span>
          ))}
        </div>
        
        <motion.div
          className="px-8 py-3 rounded-full border border-primary/50 bg-primary/10 backdrop-blur-md"
          initial={{ opacity: 0, scale: 0.8, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 1.5, ease: [0.16, 1, 0.3, 1] }}
        >
          <h2 className="text-2xl md:text-4xl font-sans tracking-widest text-white font-semibold uppercase drop-shadow-[0_0_10px_rgba(255,255,255,0.8)]">
            Super Ijtimoiy Tarmoq
          </h2>
        </motion.div>
      </div>

      <motion.div 
        className="absolute bottom-[10vh] w-[2px] h-32 bg-gradient-to-b from-primary to-transparent"
        initial={{ height: 0, opacity: 0 }}
        animate={{ height: 128, opacity: 1 }}
        transition={{ duration: 1, delay: 2.2 }}
      />
    </motion.div>
  );
}
