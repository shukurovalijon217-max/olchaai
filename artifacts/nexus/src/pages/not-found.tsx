import { Link } from "wouter";
import { motion } from "framer-motion";
import NexusLogo from "@/components/NexusLogo";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-8 bg-background">
      <motion.div
        initial={{ scale: 0.7, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      >
        <NexusLogo ringSize={90} showText={false} />
      </motion.div>

      <motion.div
        initial={{ y: 16, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.25 }}
        className="text-center"
      >
        <h1 className="text-6xl font-bold aurora-text mb-3">404</h1>
        <p className="text-muted-foreground text-base">This dimension doesn't exist.</p>
      </motion.div>

      <motion.div
        initial={{ y: 12, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.4 }}
      >
        <Link href="/">
          <div className="flex items-center gap-3 px-6 py-2.5 rounded-xl bg-primary/10 border border-primary/20 hover:bg-primary/20 transition-colors cursor-pointer">
            <NexusLogo ringSize={22} showText={true} fontSize="0.85rem" letterSpacing="0.18em" />
          </div>
        </Link>
      </motion.div>
    </div>
  );
}
