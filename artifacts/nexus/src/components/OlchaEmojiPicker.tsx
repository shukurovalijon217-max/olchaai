/**
 * OlchaEmojiPicker — OlCha platformasining o'ziga xos 9D holographic emoji tanlash paneli.
 */
import { Component, type ReactNode, Suspense, lazy } from "react";
import { motion } from "framer-motion";

const PickerLazy = lazy(() =>
  import("@emoji-mart/react").then((m) => ({ default: m.default }))
);

interface Props {
  onEmojiSelect: (emoji: { native: string }) => void;
}

interface BoundaryState {
  crashed: boolean;
}

class EmojiPickerBoundary extends Component<{ children: ReactNode }, BoundaryState> {
  state: BoundaryState = { crashed: false };
  static getDerivedStateFromError() { return { crashed: true }; }
  render() {
    if (this.state.crashed) {
      return (
        <div className="p-4 text-xs text-muted-foreground text-center rounded-xl"
          style={{ background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.1)" }}>
          Emoji picker yuklanmadi.<br/>
          <button
            className="mt-1 text-blue-400 hover:underline"
            onClick={() => this.setState({ crashed: false })}>
            Qayta urinish
          </button>
        </div>
      );
    }
    return this.props.children;
  }
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
        <EmojiPickerBoundary>
          <Suspense fallback={
            <div className="w-[352px] h-[435px] flex items-center justify-center text-xs text-muted-foreground">
              Yuklanmoqda…
            </div>
          }>
            <PickerLazy
              data={() => import("@emoji-mart/data").then((m) => m.default)}
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
          </Suspense>
        </EmojiPickerBoundary>
      </div>
    </motion.div>
  );
}
