import { useEffect } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { ArrowLeft, ShieldCheck, Lock, Database, Share2, UserCog, Mail, Cookie, Clock, Globe2, Baby, AlertTriangle, FileEdit } from "lucide-react";
import { useTranslation } from "react-i18next";
import NexusLogo from "@/components/NexusLogo";

function Section({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return (
    <div
      className="rounded-xl p-4 mb-4 flex items-start gap-3"
      style={{ background: "rgba(40,20,8,0.6)", border: "1px solid #2a1408" }}
    >
      <div className="shrink-0 mt-0.5" style={{ color: "#c07030" }}>{icon}</div>
      <div>
        <div className="text-sm font-semibold mb-1" style={{ color: "#e8c880" }}>{title}</div>
        <p className="text-xs leading-relaxed" style={{ color: "#c8a878" }}>{text}</p>
      </div>
    </div>
  );
}

export default function PrivacyPolicyPage() {
  const { t } = useTranslation();
  const [, setLocation] = useLocation();

  useEffect(() => {
    document.title = `${t("privacy_policy.title")} — GILOS`;
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

        <h1 className="text-xl font-bold mb-2 flex items-center gap-2" style={{ color: "#e8c880" }}>
          <ShieldCheck className="w-5 h-5" style={{ color: "#c07030" }} />
          {t("privacy_policy.title")}
        </h1>
        <p className="text-sm leading-relaxed mb-6" style={{ color: "#c8a878" }}>
          {t("privacy_policy.intro")}
        </p>

        <Section icon={<Database className="w-5 h-5" />} title={t("privacy_policy.collect_title")} text={t("privacy_policy.collect_text")} />
        <Section icon={<Lock className="w-5 h-5" />} title={t("privacy_policy.store_title")} text={t("privacy_policy.store_text")} />
        <Section icon={<Share2 className="w-5 h-5" />} title={t("privacy_policy.share_title")} text={t("privacy_policy.share_text")} />
        <Section icon={<Globe2 className="w-5 h-5" />} title={t("privacy_policy.transfer_title")} text={t("privacy_policy.transfer_text")} />
        <Section icon={<Clock className="w-5 h-5" />} title={t("privacy_policy.retention_title")} text={t("privacy_policy.retention_text")} />
        <Section icon={<Cookie className="w-5 h-5" />} title={t("privacy_policy.cookies_title")} text={t("privacy_policy.cookies_text")} />
        <Section icon={<UserCog className="w-5 h-5" />} title={t("privacy_policy.rights_title")} text={t("privacy_policy.rights_text")} />
        <Section icon={<Baby className="w-5 h-5" />} title={t("privacy_policy.children_title")} text={t("privacy_policy.children_text")} />
        <Section icon={<AlertTriangle className="w-5 h-5" />} title={t("privacy_policy.breach_title")} text={t("privacy_policy.breach_text")} />
        <Section icon={<FileEdit className="w-5 h-5" />} title={t("privacy_policy.changes_title")} text={t("privacy_policy.changes_text")} />
        <Section icon={<Mail className="w-5 h-5" />} title={t("privacy_policy.contact_title")} text={t("privacy_policy.contact_text")} />

        <p className="text-xs leading-relaxed mb-6" style={{ color: "#8a6040" }}>
          {t("privacy_policy.last_updated")}
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
