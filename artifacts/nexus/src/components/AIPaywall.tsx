import { motion, AnimatePresence } from "framer-motion";
import { Lock, Sparkles, Zap, Star, Infinity, Crown } from "lucide-react";
import { Link } from "wouter";
import { useTranslation } from "react-i18next";

interface AIPaywallProps {
  show: boolean;
  used: number;
  limit: number;
  onClose?: () => void;
  featureName?: string;
}

const PREMIUM_FEATURES = [
  { icon: Infinity, label: "Unlimited AI messages" },
  { icon: Zap, label: "Priority response speed" },
  { icon: Star, label: "Access to all AI features" },
  { icon: Crown, label: "Premium badge on profile" },
];

export default function AIPaywall({ show, used, limit, onClose, featureName }: AIPaywallProps) {
  const { t } = useTranslation();

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(12px)" }}
        >
          <motion.div
            initial={{ scale: 0.85, opacity: 0, y: 30 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.85, opacity: 0, y: 30 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="relative w-full max-w-sm rounded-3xl overflow-hidden"
            style={{ background: "linear-gradient(145deg, #0f0a1e 0%, #1a0a2e 50%, #0a0f1e 100%)" }}
          >
            {/* Glow effects */}
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-72 h-72 bg-violet-600/20 rounded-full blur-3xl" />
              <div className="absolute bottom-0 right-0 w-48 h-48 bg-blue-600/15 rounded-full blur-2xl" />
            </div>

            {/* Border glow */}
            <div className="absolute inset-0 rounded-3xl" style={{ background: "linear-gradient(145deg, rgba(139,92,246,0.3), rgba(59,130,246,0.2))", padding: "1px" }}>
              <div className="absolute inset-0 rounded-3xl" style={{ background: "linear-gradient(145deg, #0f0a1e, #1a0a2e)" }} />
            </div>

            <div className="relative z-10 p-7">
              {/* Lock icon */}
              <div className="flex justify-center mb-5">
                <div className="relative">
                  <div className="w-20 h-20 rounded-2xl flex items-center justify-center"
                    style={{ background: "linear-gradient(135deg, rgba(139,92,246,0.3), rgba(59,130,246,0.2))", border: "1px solid rgba(139,92,246,0.4)" }}>
                    <Lock className="w-9 h-9 text-violet-400" />
                  </div>
                  <div className="absolute -top-1 -right-1 w-6 h-6 bg-amber-500 rounded-full flex items-center justify-center">
                    <Sparkles className="w-3.5 h-3.5 text-black" />
                  </div>
                </div>
              </div>

              {/* Title */}
              <div className="text-center mb-2">
                <h2 className="text-xl font-bold text-white mb-1">
                  {t("ai.paywall_title", "AI limit reached")}
                </h2>
                <p className="text-sm text-slate-400">
                  {t("ai.paywall_sub", "You've used all {{limit}} free AI messages", { limit })}
                </p>
              </div>

              {/* Usage bar */}
              <div className="my-5 p-3.5 rounded-2xl" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}>
                <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                  <span>{t("ai.free_messages_used", "Free messages used")}</span>
                  <span className="text-white font-semibold">{used}/{limit}</span>
                </div>
                <div className="h-2 rounded-full bg-slate-700/60 overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(100, (used / limit) * 100)}%` }}
                    transition={{ duration: 0.6, delay: 0.2 }}
                    className="h-full rounded-full"
                    style={{ background: "linear-gradient(90deg, #7c3aed, #3b82f6)" }}
                  />
                </div>
              </div>

              {/* Features */}
              <div className="space-y-2 mb-6">
                <p className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-3">
                  {t("ai.premium_unlocks", "Premium unlocks")}
                </p>
                {PREMIUM_FEATURES.map((f, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ background: "rgba(139,92,246,0.15)", border: "1px solid rgba(139,92,246,0.25)" }}>
                      <f.icon className="w-3.5 h-3.5 text-violet-400" />
                    </div>
                    <span className="text-sm text-slate-300">{t(`ai.feat_${i}`, f.label)}</span>
                  </div>
                ))}
              </div>

              {/* CTA */}
              <Link href="/premium">
                <button
                  className="w-full py-3.5 rounded-2xl font-bold text-sm text-white transition-all hover:scale-[1.02] active:scale-[0.98]"
                  style={{ background: "linear-gradient(135deg, #7c3aed, #3b82f6)", boxShadow: "0 8px 24px rgba(124,58,237,0.4)" }}
                >
                  🚀 {t("ai.upgrade_now", "Upgrade to Premium")}
                </button>
              </Link>

              {onClose && (
                <button
                  onClick={onClose}
                  className="w-full mt-3 py-2 text-sm text-slate-500 hover:text-slate-400 transition-colors"
                >
                  {t("common.close", "Close")}
                </button>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
