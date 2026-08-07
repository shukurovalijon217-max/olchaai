/**
 * Quest avtomatik tracker — har qanday harakatdan keyin chaqiriladi.
 * Quest progress va tanga balansini avtomatik yangilaydi.
 */
import { db } from "@workspace/db";
import { dailyQuestsTable, questProgressTable, userCoinsTable, userTitlesTable, } from "@workspace/db";
import { eq, and } from "drizzle-orm";
const QUEST_ACTION_MAP = {
    create_post: ["create_post", "write_post"],
    like_post: ["like_3", "like_posts"],
    comment: ["comment_2", "leave_comment"],
    send_message: ["send_message"],
    watch_reel: ["watch_reel", "watch_videos"],
    streak_touch: ["streak_touch", "daily_login"],
    share_post: ["share_post"],
};
function todayDate() {
    return new Date().toISOString().slice(0, 10);
}
async function getOrCreateCoins(userId) {
    const existing = await db.query.userCoinsTable.findFirst({
        where: eq(userCoinsTable.userId, userId),
    });
    if (existing)
        return existing;
    const [created] = await db
        .insert(userCoinsTable)
        .values({ userId })
        .returning();
    return created;
}
const TITLE_THRESHOLDS = [
    { min: 0, title: "🌱 Yangi" },
    { min: 50, title: "⭐ Faol" },
    { min: 200, title: "🔥 Qizg'in" },
    { min: 500, title: "💎 Olmosli" },
    { min: 1000, title: "👑 Afsonaviy" },
];
async function checkAndGrantTitle(userId, totalEarned) {
    const earned = TITLE_THRESHOLDS.filter(t => totalEarned >= t.min);
    const newTitle = earned[earned.length - 1]?.title;
    if (!newTitle)
        return;
    const existing = await db
        .select()
        .from(userTitlesTable)
        .where(and(eq(userTitlesTable.userId, userId), eq(userTitlesTable.title, newTitle)));
    if (existing.length === 0) {
        await db.insert(userTitlesTable).values({ userId, title: newTitle });
    }
}
/**
 * Foydalanuvchi biror harakat qilganda chaqiriladi.
 * actionKey: 'create_post' | 'like_post' | 'comment' | 'send_message' | 'watch_reel' | 'streak_touch' | 'share_post'
 * Xatolarni ichida ushlab qoladi — asosiy route ga ta'sir qilmaydi.
 */
export async function trackQuestAction(userId, actionKey) {
    try {
        const questKeys = QUEST_ACTION_MAP[actionKey];
        if (!questKeys?.length)
            return;
        const today = todayDate();
        const quests = await db
            .select()
            .from(dailyQuestsTable)
            .where(eq(dailyQuestsTable.isActive, true));
        let totalCoinsEarned = 0;
        for (const questKey of questKeys) {
            const quest = quests.find(q => q.key === questKey);
            if (!quest)
                continue;
            const existing = await db.query.questProgressTable.findFirst({
                where: and(eq(questProgressTable.userId, userId), eq(questProgressTable.questKey, questKey), eq(questProgressTable.date, today)),
            });
            // Allaqachon tugatilgan quest — o'tkazib yuborish
            if (existing?.completedAt)
                continue;
            const currentProgress = existing?.progress ?? 0;
            const newProgress = Math.min(currentProgress + 1, quest.target);
            const completed = newProgress >= quest.target;
            const completedAt = completed ? new Date() : null;
            if (existing) {
                await db
                    .update(questProgressTable)
                    .set({ progress: newProgress, completedAt })
                    .where(eq(questProgressTable.id, existing.id));
            }
            else {
                await db.insert(questProgressTable).values({
                    userId,
                    questKey,
                    progress: newProgress,
                    completedAt,
                    date: today,
                });
            }
            // Quest tugallanganda tanga berish
            if (completed) {
                const coins = await getOrCreateCoins(userId);
                const newBalance = coins.balance + quest.reward;
                const newTotalEarned = coins.totalEarned + quest.reward;
                await db
                    .update(userCoinsTable)
                    .set({
                    balance: newBalance,
                    totalEarned: newTotalEarned,
                    updatedAt: new Date(),
                })
                    .where(eq(userCoinsTable.userId, userId));
                totalCoinsEarned += quest.reward;
                await checkAndGrantTitle(userId, newTotalEarned);
            }
        }
    }
    catch {
        // Quest xatosi asosiy amaliyotni buzmasin
    }
}
