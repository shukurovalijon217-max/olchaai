/**
 * OlchaEmojiPicker — OlCha platformasining o'ziga xos 9D holographic emoji tanlash paneli.
 * Hali internetda bunday emoji tanlash yo'q — faqat OlCha'da.
 */
import { motion, AnimatePresence } from "framer-motion";
import Picker from "@emoji-mart/react";
import emojiData from "@emoji-mart/data";

interface Props {
  onEmojiSelect: (emoji: { native: string }) => void;
}

export function OlchaEmojiPicker({ onEmojiSelect }: Props) {
  return (
    <motion.div
      className="olcha-picker-wrap"
      initial={{ opacity: 0, scale: 0.88, y: 14 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.88, y: 14 }}
      transition={{ type: "spring", stiffness: 460, damping: 32 }}
    >
      <div className="olcha-picker-holo-bar" />
      <div className="olcha-picker-orb olcha-picker-orb-1" />
      <div className="olcha-picker-orb olcha-picker-orb-2" />
      <div className="olcha-picker-orb olcha-picker-orb-3" />
      <div style={{ position: "relative", zIndex: 1 }}>
        <Picker
          data={emojiData}
          onEmojiSelect={onEmojiSelect}
          theme="dark"
          locale="uz"
          previewPosition="none"
          skinTonePosition="search"
          set="twitter"
          perLine={7}
          emojiSize={22}
          emojiButtonSize={34}
          maxFrequentRows={2}
        />
      </div>
    </motion.div>
  );
}
