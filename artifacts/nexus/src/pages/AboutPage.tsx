import { useEffect } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { MapPin, User, Sparkles, ArrowLeft } from "lucide-react";
import { useTranslation } from "react-i18next";
import NexusLogo from "@/components/NexusLogo";

export default function AboutPage() {
  const { t } = useTranslation();
  const [, setLocation] = useLocation();

  useEffect(() => {
    document.title = `${t("about.title")} — GilosAI`;
  }, [t]);

  return (
    <div
      className="min-h-screen w-full flex items-center justify-center px-6 py-12"
      style={{ background: "radial-gradient(ellipse at top, #1a0e06 0%, #060302 60%, #000000 100%)" }}
    >
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-lg rounded-2xl p-8"
        style={{
          background: "rgba(20,10,5,0.85)",
          border: "1px solid rgba(160,90,30,0.35)",
          boxShadow: "0 20px 60px rgba(0,0,0,0.6)",
        }}
      >
        <div className="flex items-center gap-3 mb-6">
          <NexusLogo ringSize={40} showText={true} fontSize="1.05rem" letterSpacing="0.2em" />
        </div>

        <h1 className="text-xl font-bold mb-2" style={{ color: "#e8c880" }}>
          {t("about.title")}
        </h1>
        <p className="text-sm leading-relaxed mb-6" style={{ color: "#c8a878" }}>
          {t("about.intro")}
        </p>

        <div className="rounded-xl p-4 mb-4 flex items-start gap-3" style={{ background: "rgba(40,20,8,0.6)", border: "1px solid #2a1408" }}>
          <User className="w-5 h-5 shrink-0 mt-0.5" style={{ color: "#c07030" }} />
          <div>
            <div className="text-xs uppercase tracking-wide mb-1" style={{ color: "#8a6040" }}>
              {t("about.founder_label")}
            </div>
            <div className="text-base font-semibold" style={{ color: "#e8c880" }}>
              {t("about.founder_name")}
            </div>
            <div className="text-xs mt-0.5" style={{ color: "#a08050" }}>
              {t("about.founder_role")}
            </div>
          </div>
        </div>

        <div className="rounded-xl p-4 mb-6 flex items-start gap-3" style={{ background: "rgba(40,20,8,0.6)", border: "1px solid #2a1408" }}>
          <MapPin className="w-5 h-5 shrink-0 mt-0.5" style={{ color: "#c07030" }} />
          <div>
            <div className="text-xs uppercase tracking-wide mb-1" style={{ color: "#8a6040" }}>
              {t("about.location_label")}
            </div>
            <div className="text-base font-semibold" style={{ color: "#e8c880" }}>
              {t("about.location_value")}
            </div>
          </div>
        </div>

        <div className="rounded-xl p-4 mb-6 flex items-start gap-3" style={{ background: "rgba(40,20,8,0.6)", border: "1px solid #2a1408" }}>
          <Sparkles className="w-5 h-5 shrink-0 mt-0.5" style={{ color: "#c07030" }} />
          <div>
            <div className="text-xs uppercase tracking-wide mb-1" style={{ color: "#8a6040" }}>
              {t("about.mission_title")}
            </div>
            <p className="text-sm leading-relaxed" style={{ color: "#c8a878" }}>
              {t("about.mission_text")}
            </p>
          </div>
        </div>

        <p className="text-xs leading-relaxed mb-6" style={{ color: "#8a6040" }}>
          {t("about.contact_hint")}
        </p>

        <button
          type="button"
          onClick={() => setLocation("/")}
          className="flex items-center gap-2 text-sm font-semibold hover:underline"
          style={{ color: "#c07030" }}
        >
          <ArrowLeft className="w-4 h-4" />
          {t("about.back")}
        </button>
      </motion.div>
    </div>
  );
}
