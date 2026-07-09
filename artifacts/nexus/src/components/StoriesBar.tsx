import { useRef } from "react";
import { motion } from "framer-motion";
import { Plus } from "lucide-react";
import { useListStories } from "@workspace/api-client-react";
import { useTranslation } from "react-i18next";

interface Props {
  onCreateStory?: () => void;
  onAvatarClick?: (authorId: number, rect: DOMRect) => void;
}

export default function StoriesBar({ onCreateStory, onAvatarClick }: Props) {
  const { t } = useTranslation();
  const { data: stories = [] } = useListStories();
  const itemRefs = useRef<Map<number, HTMLDivElement>>(new Map());

  const handleStoryClick = (authorId: number | undefined) => {
    if (authorId == null || !onAvatarClick) return;
    const el = itemRefs.current.get(authorId);
    if (el) {
      onAvatarClick(authorId, el.getBoundingClientRect());
    }
  };

  return (
    <div className="bg-card border border-border rounded-2xl p-4">
      <div className="flex gap-4 overflow-x-auto scrollbar-hide">
        {/* Add Story */}
        <motion.div
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onCreateStory}
          className="flex flex-col items-center gap-1.5 flex-shrink-0 cursor-pointer"
        >
          <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center border-2 border-dashed border-primary/50 hover:border-primary transition-colors">
            <Plus className="w-5 h-5 text-primary" />
          </div>
          <span className="text-xs text-muted-foreground font-medium w-14 text-center truncate">Story</span>
        </motion.div>

        {/* Stories */}
        {stories.slice(0, 12).map((story, i) => (
          <motion.div
            key={story.id}
            ref={(el) => {
              if (el && story.author?.id != null) {
                itemRefs.current.set(story.author.id, el);
              }
            }}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.04 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => handleStoryClick(story.author?.id)}
            className="flex flex-col items-center gap-1.5 flex-shrink-0 cursor-pointer"
          >
            <div className={(story as any).isViewed ? "story-ring-viewed" : "story-ring"}>
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary/30 to-accent/30 overflow-hidden bg-card">
                {story.author?.avatarUrl ? (
                  <img src={story.author.avatarUrl} alt="" className="w-full h-full object-cover" loading="lazy" decoding="async" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <span className="text-sm font-bold text-primary">{story.author?.displayName?.[0]}</span>
                  </div>
                )}
              </div>
            </div>
            <span className="text-xs text-muted-foreground w-14 text-center truncate">{story.author?.username}</span>
          </motion.div>
        ))}

        {stories.length === 0 && (
          <div className="flex items-center text-xs text-muted-foreground py-2">{t("home.no_stories")}</div>
        )}
      </div>
    </div>
  );
}
