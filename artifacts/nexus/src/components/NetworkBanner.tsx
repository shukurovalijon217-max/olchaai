/**
 * NetworkBanner
 * Floating top banner that appears when the user goes offline and
 * auto-dismisses 3 s after reconnection.
 *
 * Usage: mount once near the root of the app (e.g. inside Layout).
 */
import { AnimatePresence, motion } from "framer-motion";
import { Wifi, WifiOff } from "lucide-react";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";

export function NetworkBanner() {
  const { isOnline, justReconnected } = useNetworkStatus();

  const show = !isOnline || justReconnected;

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          key="network-banner"
          initial={{ y: -60, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -60, opacity: 0 }}
          transition={{ type: "spring", stiffness: 420, damping: 28 }}
          className="fixed top-0 inset-x-0 z-[9999] flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold shadow-xl select-none"
          style={{
            background: isOnline
              ? "linear-gradient(90deg, #064e3b, #065f46)"
              : "linear-gradient(90deg, #7f1d1d, #991b1b)",
            color: "#fff",
          }}
        >
          {isOnline ? (
            <>
              <Wifi className="w-4 h-4 flex-shrink-0" />
              Internet aloqasi tiklandi ✓
            </>
          ) : (
            <>
              <WifiOff className="w-4 h-4 flex-shrink-0" />
              Internet aloqasi yo&apos;q — sahifa keshlangan ma&apos;lumotlarni ko&apos;rsatmoqda
            </>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
