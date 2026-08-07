import { relations } from "drizzle-orm/relations";
import { users, comments, posts, postLikes, reels, reelLikes, stories, storyViews, notifications, follows, groups, groupMembers, moderationQueue, contentReports, paymentMethods, transactions, wallets, liveStreams, creatorPlans, creatorSubscriptions, liveGifts, productOrders, productReviews, products, voiceComments, userCoins, userBooks, reelComments, premiumConfig, questProgress, userTitles, aiConversations, aiMessages, coViewRooms, coViewMembers, anonZones, anonPosts, scenarios, scenarioBranches, userMoods, aiTwinConfig, aiTwinChats, aiTwinMessages, factChecks, credibilityScores, coSpaces, coSpaceMembers, coSpaceTasks, chatConversations, chatParticipants, chatMessages, expenseDeductionRequests, monetizationConfig, contentEarnings, payoutRequests, aiModerationEvents, creatorMonetization, commentLikes, groupPosts, groupPostLikes, postVotes, groupPostComments, groupPostCommentLikes, groupPostReactions, groupPolls, groupPollVotes, groupPostBookmarks, groupPostReports, hotTakeVotes, anonQuestions, challenges, reelCollaborators, challengeParticipants, reelWatchProgress, userStreaks, growTogetherGoals, growTogetherConnections, reelVersions, pushTokens, postEmbeddings, userInterestProfiles, userBlocks, storyReactions } from "./schema";

export const commentsRelations = relations(comments, ({one, many}) => ({
	user: one(users, {
		fields: [comments.authorId],
		references: [users.id]
	}),
	post: one(posts, {
		fields: [comments.postId],
		references: [posts.id]
	}),
	commentLikes: many(commentLikes),
}));

export const usersRelations = relations(users, ({many}) => ({
	comments: many(comments),
	postLikes: many(postLikes),
	reelLikes: many(reelLikes),
	reels: many(reels),
	stories: many(stories),
	storyViews: many(storyViews),
	notifications: many(notifications),
	follows_followerId: many(follows, {
		relationName: "follows_followerId_users_id"
	}),
	follows_followingId: many(follows, {
		relationName: "follows_followingId_users_id"
	}),
	groupMembers: many(groupMembers),
	moderationQueues_authorId: many(moderationQueue, {
		relationName: "moderationQueue_authorId_users_id"
	}),
	moderationQueues_moderatorId: many(moderationQueue, {
		relationName: "moderationQueue_moderatorId_users_id"
	}),
	contentReports: many(contentReports),
	paymentMethods: many(paymentMethods),
	transactions: many(transactions),
	wallets: many(wallets),
	liveStreams: many(liveStreams),
	creatorPlans: many(creatorPlans),
	creatorSubscriptions_creatorId: many(creatorSubscriptions, {
		relationName: "creatorSubscriptions_creatorId_users_id"
	}),
	creatorSubscriptions_subscriberId: many(creatorSubscriptions, {
		relationName: "creatorSubscriptions_subscriberId_users_id"
	}),
	liveGifts_receiverId: many(liveGifts, {
		relationName: "liveGifts_receiverId_users_id"
	}),
	liveGifts_senderId: many(liveGifts, {
		relationName: "liveGifts_senderId_users_id"
	}),
	productReviews: many(productReviews),
	voiceComments: many(voiceComments),
	userCoins: many(userCoins),
	userBooks: many(userBooks),
	reelComments: many(reelComments),
	premiumConfigs: many(premiumConfig),
	questProgresses: many(questProgress),
	userTitles: many(userTitles),
	aiConversations: many(aiConversations),
	coViewRooms: many(coViewRooms),
	coViewMembers: many(coViewMembers),
	scenarios: many(scenarios),
	userMoods: many(userMoods),
	aiTwinConfigs: many(aiTwinConfig),
	aiTwinChats_twinOwnerId: many(aiTwinChats, {
		relationName: "aiTwinChats_twinOwnerId_users_id"
	}),
	aiTwinChats_visitorId: many(aiTwinChats, {
		relationName: "aiTwinChats_visitorId_users_id"
	}),
	credibilityScores: many(credibilityScores),
	coSpaces: many(coSpaces),
	coSpaceMembers: many(coSpaceMembers),
	coSpaceTasks: many(coSpaceTasks),
	chatParticipants: many(chatParticipants),
	chatMessages: many(chatMessages),
	expenseDeductionRequests: many(expenseDeductionRequests),
	monetizationConfigs: many(monetizationConfig),
	contentEarnings: many(contentEarnings),
	payoutRequests_processedBy: many(payoutRequests, {
		relationName: "payoutRequests_processedBy_users_id"
	}),
	payoutRequests_userId: many(payoutRequests, {
		relationName: "payoutRequests_userId_users_id"
	}),
	aiModerationEvents: many(aiModerationEvents),
	creatorMonetizations_reviewedBy: many(creatorMonetization, {
		relationName: "creatorMonetization_reviewedBy_users_id"
	}),
	creatorMonetizations_userId: many(creatorMonetization, {
		relationName: "creatorMonetization_userId_users_id"
	}),
	products: many(products),
	productOrders_buyerId: many(productOrders, {
		relationName: "productOrders_buyerId_users_id"
	}),
	productOrders_sellerId: many(productOrders, {
		relationName: "productOrders_sellerId_users_id"
	}),
	commentLikes: many(commentLikes),
	posts: many(posts),
	groups: many(groups),
	groupPostLikes: many(groupPostLikes),
	postVotes: many(postVotes),
	groupPosts: many(groupPosts),
	groupPostComments: many(groupPostComments),
	groupPostCommentLikes: many(groupPostCommentLikes),
	groupPostReactions: many(groupPostReactions),
	groupPolls: many(groupPolls),
	groupPollVotes: many(groupPollVotes),
	groupPostBookmarks: many(groupPostBookmarks),
	groupPostReports: many(groupPostReports),
	hotTakeVotes: many(hotTakeVotes),
	anonQuestions: many(anonQuestions),
	challenges: many(challenges),
	reelCollaborators: many(reelCollaborators),
	challengeParticipants: many(challengeParticipants),
	reelWatchProgresses: many(reelWatchProgress),
	userStreaks: many(userStreaks),
	growTogetherGoals: many(growTogetherGoals),
	growTogetherConnections_user1Id: many(growTogetherConnections, {
		relationName: "growTogetherConnections_user1Id_users_id"
	}),
	growTogetherConnections_user2Id: many(growTogetherConnections, {
		relationName: "growTogetherConnections_user2Id_users_id"
	}),
	reelVersions: many(reelVersions),
	pushTokens: many(pushTokens),
	userInterestProfiles: many(userInterestProfiles),
	userBlocks_blockedId: many(userBlocks, {
		relationName: "userBlocks_blockedId_users_id"
	}),
	userBlocks_blockerId: many(userBlocks, {
		relationName: "userBlocks_blockerId_users_id"
	}),
	storyReactions: many(storyReactions),
}));

export const postsRelations = relations(posts, ({one, many}) => ({
	comments: many(comments),
	postLikes: many(postLikes),
	voiceComments: many(voiceComments),
	factChecks: many(factChecks),
	user: one(users, {
		fields: [posts.authorId],
		references: [users.id]
	}),
	postVotes: many(postVotes),
	hotTakeVotes: many(hotTakeVotes),
	postEmbeddings: many(postEmbeddings),
}));

export const postLikesRelations = relations(postLikes, ({one}) => ({
	post: one(posts, {
		fields: [postLikes.postId],
		references: [posts.id]
	}),
	user: one(users, {
		fields: [postLikes.userId],
		references: [users.id]
	}),
}));

export const reelLikesRelations = relations(reelLikes, ({one}) => ({
	reel: one(reels, {
		fields: [reelLikes.reelId],
		references: [reels.id]
	}),
	user: one(users, {
		fields: [reelLikes.userId],
		references: [users.id]
	}),
}));

export const reelsRelations = relations(reels, ({one, many}) => ({
	reelLikes: many(reelLikes),
	user: one(users, {
		fields: [reels.authorId],
		references: [users.id]
	}),
	reelComments: many(reelComments),
	reelWatchProgresses: many(reelWatchProgress),
	reelVersions: many(reelVersions),
}));

export const storiesRelations = relations(stories, ({one, many}) => ({
	user: one(users, {
		fields: [stories.authorId],
		references: [users.id]
	}),
	storyViews: many(storyViews),
	storyReactions: many(storyReactions),
}));

export const storyViewsRelations = relations(storyViews, ({one}) => ({
	story: one(stories, {
		fields: [storyViews.storyId],
		references: [stories.id]
	}),
	user: one(users, {
		fields: [storyViews.userId],
		references: [users.id]
	}),
}));

export const notificationsRelations = relations(notifications, ({one}) => ({
	user: one(users, {
		fields: [notifications.userId],
		references: [users.id]
	}),
}));

export const followsRelations = relations(follows, ({one}) => ({
	user_followerId: one(users, {
		fields: [follows.followerId],
		references: [users.id],
		relationName: "follows_followerId_users_id"
	}),
	user_followingId: one(users, {
		fields: [follows.followingId],
		references: [users.id],
		relationName: "follows_followingId_users_id"
	}),
}));

export const groupMembersRelations = relations(groupMembers, ({one}) => ({
	group: one(groups, {
		fields: [groupMembers.groupId],
		references: [groups.id]
	}),
	user: one(users, {
		fields: [groupMembers.userId],
		references: [users.id]
	}),
}));

export const groupsRelations = relations(groups, ({one, many}) => ({
	groupMembers: many(groupMembers),
	user: one(users, {
		fields: [groups.creatorId],
		references: [users.id]
	}),
	groupPost: one(groupPosts, {
		fields: [groups.pinnedPostId],
		references: [groupPosts.id],
		relationName: "groups_pinnedPostId_groupPosts_id"
	}),
	groupPosts: many(groupPosts, {
		relationName: "groupPosts_groupId_groups_id"
	}),
	groupPolls: many(groupPolls),
}));

export const moderationQueueRelations = relations(moderationQueue, ({one}) => ({
	user_authorId: one(users, {
		fields: [moderationQueue.authorId],
		references: [users.id],
		relationName: "moderationQueue_authorId_users_id"
	}),
	user_moderatorId: one(users, {
		fields: [moderationQueue.moderatorId],
		references: [users.id],
		relationName: "moderationQueue_moderatorId_users_id"
	}),
}));

export const contentReportsRelations = relations(contentReports, ({one}) => ({
	user: one(users, {
		fields: [contentReports.reporterId],
		references: [users.id]
	}),
}));

export const paymentMethodsRelations = relations(paymentMethods, ({one}) => ({
	user: one(users, {
		fields: [paymentMethods.userId],
		references: [users.id]
	}),
}));

export const transactionsRelations = relations(transactions, ({one}) => ({
	user: one(users, {
		fields: [transactions.userId],
		references: [users.id]
	}),
	wallet: one(wallets, {
		fields: [transactions.walletId],
		references: [wallets.id]
	}),
}));

export const walletsRelations = relations(wallets, ({one, many}) => ({
	transactions: many(transactions),
	user: one(users, {
		fields: [wallets.userId],
		references: [users.id]
	}),
}));

export const liveStreamsRelations = relations(liveStreams, ({one, many}) => ({
	user: one(users, {
		fields: [liveStreams.hostId],
		references: [users.id]
	}),
	liveGifts: many(liveGifts),
}));

export const creatorPlansRelations = relations(creatorPlans, ({one, many}) => ({
	user: one(users, {
		fields: [creatorPlans.creatorId],
		references: [users.id]
	}),
	creatorSubscriptions: many(creatorSubscriptions),
}));

export const creatorSubscriptionsRelations = relations(creatorSubscriptions, ({one}) => ({
	user_creatorId: one(users, {
		fields: [creatorSubscriptions.creatorId],
		references: [users.id],
		relationName: "creatorSubscriptions_creatorId_users_id"
	}),
	creatorPlan: one(creatorPlans, {
		fields: [creatorSubscriptions.planId],
		references: [creatorPlans.id]
	}),
	user_subscriberId: one(users, {
		fields: [creatorSubscriptions.subscriberId],
		references: [users.id],
		relationName: "creatorSubscriptions_subscriberId_users_id"
	}),
}));

export const liveGiftsRelations = relations(liveGifts, ({one}) => ({
	liveStream: one(liveStreams, {
		fields: [liveGifts.liveStreamId],
		references: [liveStreams.id]
	}),
	user_receiverId: one(users, {
		fields: [liveGifts.receiverId],
		references: [users.id],
		relationName: "liveGifts_receiverId_users_id"
	}),
	user_senderId: one(users, {
		fields: [liveGifts.senderId],
		references: [users.id],
		relationName: "liveGifts_senderId_users_id"
	}),
}));

export const productReviewsRelations = relations(productReviews, ({one}) => ({
	productOrder: one(productOrders, {
		fields: [productReviews.orderId],
		references: [productOrders.id]
	}),
	product: one(products, {
		fields: [productReviews.productId],
		references: [products.id]
	}),
	user: one(users, {
		fields: [productReviews.reviewerId],
		references: [users.id]
	}),
}));

export const productOrdersRelations = relations(productOrders, ({one, many}) => ({
	productReviews: many(productReviews),
	user_buyerId: one(users, {
		fields: [productOrders.buyerId],
		references: [users.id],
		relationName: "productOrders_buyerId_users_id"
	}),
	product: one(products, {
		fields: [productOrders.productId],
		references: [products.id]
	}),
	user_sellerId: one(users, {
		fields: [productOrders.sellerId],
		references: [users.id],
		relationName: "productOrders_sellerId_users_id"
	}),
}));

export const productsRelations = relations(products, ({one, many}) => ({
	productReviews: many(productReviews),
	user: one(users, {
		fields: [products.sellerId],
		references: [users.id]
	}),
	productOrders: many(productOrders),
}));

export const voiceCommentsRelations = relations(voiceComments, ({one}) => ({
	user: one(users, {
		fields: [voiceComments.authorId],
		references: [users.id]
	}),
	post: one(posts, {
		fields: [voiceComments.postId],
		references: [posts.id]
	}),
}));

export const userCoinsRelations = relations(userCoins, ({one}) => ({
	user: one(users, {
		fields: [userCoins.userId],
		references: [users.id]
	}),
}));

export const userBooksRelations = relations(userBooks, ({one}) => ({
	user: one(users, {
		fields: [userBooks.userId],
		references: [users.id]
	}),
}));

export const reelCommentsRelations = relations(reelComments, ({one}) => ({
	user: one(users, {
		fields: [reelComments.authorId],
		references: [users.id]
	}),
	reel: one(reels, {
		fields: [reelComments.reelId],
		references: [reels.id]
	}),
}));

export const premiumConfigRelations = relations(premiumConfig, ({one}) => ({
	user: one(users, {
		fields: [premiumConfig.updatedBy],
		references: [users.id]
	}),
}));

export const questProgressRelations = relations(questProgress, ({one}) => ({
	user: one(users, {
		fields: [questProgress.userId],
		references: [users.id]
	}),
}));

export const userTitlesRelations = relations(userTitles, ({one}) => ({
	user: one(users, {
		fields: [userTitles.userId],
		references: [users.id]
	}),
}));

export const aiConversationsRelations = relations(aiConversations, ({one, many}) => ({
	user: one(users, {
		fields: [aiConversations.userId],
		references: [users.id]
	}),
	aiMessages: many(aiMessages),
}));

export const aiMessagesRelations = relations(aiMessages, ({one}) => ({
	aiConversation: one(aiConversations, {
		fields: [aiMessages.conversationId],
		references: [aiConversations.id]
	}),
}));

export const coViewRoomsRelations = relations(coViewRooms, ({one, many}) => ({
	user: one(users, {
		fields: [coViewRooms.hostId],
		references: [users.id]
	}),
	coViewMembers: many(coViewMembers),
}));

export const coViewMembersRelations = relations(coViewMembers, ({one}) => ({
	coViewRoom: one(coViewRooms, {
		fields: [coViewMembers.roomId],
		references: [coViewRooms.id]
	}),
	user: one(users, {
		fields: [coViewMembers.userId],
		references: [users.id]
	}),
}));

export const anonPostsRelations = relations(anonPosts, ({one}) => ({
	anonZone: one(anonZones, {
		fields: [anonPosts.zoneId],
		references: [anonZones.id]
	}),
}));

export const anonZonesRelations = relations(anonZones, ({many}) => ({
	anonPosts: many(anonPosts),
}));

export const scenariosRelations = relations(scenarios, ({one, many}) => ({
	user: one(users, {
		fields: [scenarios.creatorId],
		references: [users.id]
	}),
	scenarioBranches: many(scenarioBranches),
}));

export const scenarioBranchesRelations = relations(scenarioBranches, ({one}) => ({
	scenario: one(scenarios, {
		fields: [scenarioBranches.scenarioId],
		references: [scenarios.id]
	}),
}));

export const userMoodsRelations = relations(userMoods, ({one}) => ({
	user: one(users, {
		fields: [userMoods.userId],
		references: [users.id]
	}),
}));

export const aiTwinConfigRelations = relations(aiTwinConfig, ({one}) => ({
	user: one(users, {
		fields: [aiTwinConfig.userId],
		references: [users.id]
	}),
}));

export const aiTwinChatsRelations = relations(aiTwinChats, ({one, many}) => ({
	user_twinOwnerId: one(users, {
		fields: [aiTwinChats.twinOwnerId],
		references: [users.id],
		relationName: "aiTwinChats_twinOwnerId_users_id"
	}),
	user_visitorId: one(users, {
		fields: [aiTwinChats.visitorId],
		references: [users.id],
		relationName: "aiTwinChats_visitorId_users_id"
	}),
	aiTwinMessages: many(aiTwinMessages),
}));

export const aiTwinMessagesRelations = relations(aiTwinMessages, ({one}) => ({
	aiTwinChat: one(aiTwinChats, {
		fields: [aiTwinMessages.chatId],
		references: [aiTwinChats.id]
	}),
}));

export const factChecksRelations = relations(factChecks, ({one}) => ({
	post: one(posts, {
		fields: [factChecks.postId],
		references: [posts.id]
	}),
}));

export const credibilityScoresRelations = relations(credibilityScores, ({one}) => ({
	user: one(users, {
		fields: [credibilityScores.userId],
		references: [users.id]
	}),
}));

export const coSpacesRelations = relations(coSpaces, ({one, many}) => ({
	user: one(users, {
		fields: [coSpaces.creatorId],
		references: [users.id]
	}),
	coSpaceMembers: many(coSpaceMembers),
	coSpaceTasks: many(coSpaceTasks),
}));

export const coSpaceMembersRelations = relations(coSpaceMembers, ({one}) => ({
	coSpace: one(coSpaces, {
		fields: [coSpaceMembers.spaceId],
		references: [coSpaces.id]
	}),
	user: one(users, {
		fields: [coSpaceMembers.userId],
		references: [users.id]
	}),
}));

export const coSpaceTasksRelations = relations(coSpaceTasks, ({one}) => ({
	user: one(users, {
		fields: [coSpaceTasks.assigneeId],
		references: [users.id]
	}),
	coSpace: one(coSpaces, {
		fields: [coSpaceTasks.spaceId],
		references: [coSpaces.id]
	}),
}));

export const chatParticipantsRelations = relations(chatParticipants, ({one}) => ({
	chatConversation: one(chatConversations, {
		fields: [chatParticipants.conversationId],
		references: [chatConversations.id]
	}),
	user: one(users, {
		fields: [chatParticipants.userId],
		references: [users.id]
	}),
}));

export const chatConversationsRelations = relations(chatConversations, ({many}) => ({
	chatParticipants: many(chatParticipants),
	chatMessages: many(chatMessages),
}));

export const chatMessagesRelations = relations(chatMessages, ({one}) => ({
	chatConversation: one(chatConversations, {
		fields: [chatMessages.conversationId],
		references: [chatConversations.id]
	}),
	user: one(users, {
		fields: [chatMessages.senderId],
		references: [users.id]
	}),
}));

export const expenseDeductionRequestsRelations = relations(expenseDeductionRequests, ({one}) => ({
	user: one(users, {
		fields: [expenseDeductionRequests.approvedBy],
		references: [users.id]
	}),
}));

export const monetizationConfigRelations = relations(monetizationConfig, ({one}) => ({
	user: one(users, {
		fields: [monetizationConfig.updatedBy],
		references: [users.id]
	}),
}));

export const contentEarningsRelations = relations(contentEarnings, ({one}) => ({
	user: one(users, {
		fields: [contentEarnings.authorId],
		references: [users.id]
	}),
}));

export const payoutRequestsRelations = relations(payoutRequests, ({one}) => ({
	user_processedBy: one(users, {
		fields: [payoutRequests.processedBy],
		references: [users.id],
		relationName: "payoutRequests_processedBy_users_id"
	}),
	user_userId: one(users, {
		fields: [payoutRequests.userId],
		references: [users.id],
		relationName: "payoutRequests_userId_users_id"
	}),
}));

export const aiModerationEventsRelations = relations(aiModerationEvents, ({one}) => ({
	user: one(users, {
		fields: [aiModerationEvents.authorId],
		references: [users.id]
	}),
}));

export const creatorMonetizationRelations = relations(creatorMonetization, ({one}) => ({
	user_reviewedBy: one(users, {
		fields: [creatorMonetization.reviewedBy],
		references: [users.id],
		relationName: "creatorMonetization_reviewedBy_users_id"
	}),
	user_userId: one(users, {
		fields: [creatorMonetization.userId],
		references: [users.id],
		relationName: "creatorMonetization_userId_users_id"
	}),
}));

export const commentLikesRelations = relations(commentLikes, ({one}) => ({
	comment: one(comments, {
		fields: [commentLikes.commentId],
		references: [comments.id]
	}),
	user: one(users, {
		fields: [commentLikes.userId],
		references: [users.id]
	}),
}));

export const groupPostsRelations = relations(groupPosts, ({one, many}) => ({
	groups: many(groups, {
		relationName: "groups_pinnedPostId_groupPosts_id"
	}),
	groupPostLikes: many(groupPostLikes),
	user: one(users, {
		fields: [groupPosts.authorId],
		references: [users.id]
	}),
	group: one(groups, {
		fields: [groupPosts.groupId],
		references: [groups.id],
		relationName: "groupPosts_groupId_groups_id"
	}),
	groupPostComments: many(groupPostComments),
	groupPostReactions: many(groupPostReactions),
	groupPostBookmarks: many(groupPostBookmarks),
	groupPostReports: many(groupPostReports),
}));

export const groupPostLikesRelations = relations(groupPostLikes, ({one}) => ({
	groupPost: one(groupPosts, {
		fields: [groupPostLikes.postId],
		references: [groupPosts.id]
	}),
	user: one(users, {
		fields: [groupPostLikes.userId],
		references: [users.id]
	}),
}));

export const postVotesRelations = relations(postVotes, ({one}) => ({
	post: one(posts, {
		fields: [postVotes.postId],
		references: [posts.id]
	}),
	user: one(users, {
		fields: [postVotes.userId],
		references: [users.id]
	}),
}));

export const groupPostCommentsRelations = relations(groupPostComments, ({one, many}) => ({
	user: one(users, {
		fields: [groupPostComments.authorId],
		references: [users.id]
	}),
	groupPostComment: one(groupPostComments, {
		fields: [groupPostComments.parentId],
		references: [groupPostComments.id],
		relationName: "groupPostComments_parentId_groupPostComments_id"
	}),
	groupPostComments: many(groupPostComments, {
		relationName: "groupPostComments_parentId_groupPostComments_id"
	}),
	groupPost: one(groupPosts, {
		fields: [groupPostComments.postId],
		references: [groupPosts.id]
	}),
	groupPostCommentLikes: many(groupPostCommentLikes),
}));

export const groupPostCommentLikesRelations = relations(groupPostCommentLikes, ({one}) => ({
	groupPostComment: one(groupPostComments, {
		fields: [groupPostCommentLikes.commentId],
		references: [groupPostComments.id]
	}),
	user: one(users, {
		fields: [groupPostCommentLikes.userId],
		references: [users.id]
	}),
}));

export const groupPostReactionsRelations = relations(groupPostReactions, ({one}) => ({
	groupPost: one(groupPosts, {
		fields: [groupPostReactions.postId],
		references: [groupPosts.id]
	}),
	user: one(users, {
		fields: [groupPostReactions.userId],
		references: [users.id]
	}),
}));

export const groupPollsRelations = relations(groupPolls, ({one, many}) => ({
	user: one(users, {
		fields: [groupPolls.creatorId],
		references: [users.id]
	}),
	group: one(groups, {
		fields: [groupPolls.groupId],
		references: [groups.id]
	}),
	groupPollVotes: many(groupPollVotes),
}));

export const groupPollVotesRelations = relations(groupPollVotes, ({one}) => ({
	groupPoll: one(groupPolls, {
		fields: [groupPollVotes.pollId],
		references: [groupPolls.id]
	}),
	user: one(users, {
		fields: [groupPollVotes.userId],
		references: [users.id]
	}),
}));

export const groupPostBookmarksRelations = relations(groupPostBookmarks, ({one}) => ({
	groupPost: one(groupPosts, {
		fields: [groupPostBookmarks.postId],
		references: [groupPosts.id]
	}),
	user: one(users, {
		fields: [groupPostBookmarks.userId],
		references: [users.id]
	}),
}));

export const groupPostReportsRelations = relations(groupPostReports, ({one}) => ({
	groupPost: one(groupPosts, {
		fields: [groupPostReports.postId],
		references: [groupPosts.id]
	}),
	user: one(users, {
		fields: [groupPostReports.reporterId],
		references: [users.id]
	}),
}));

export const hotTakeVotesRelations = relations(hotTakeVotes, ({one}) => ({
	post: one(posts, {
		fields: [hotTakeVotes.postId],
		references: [posts.id]
	}),
	user: one(users, {
		fields: [hotTakeVotes.userId],
		references: [users.id]
	}),
}));

export const anonQuestionsRelations = relations(anonQuestions, ({one}) => ({
	user: one(users, {
		fields: [anonQuestions.recipientId],
		references: [users.id]
	}),
}));

export const challengesRelations = relations(challenges, ({one, many}) => ({
	user: one(users, {
		fields: [challenges.creatorId],
		references: [users.id]
	}),
	challengeParticipants: many(challengeParticipants),
}));

export const reelCollaboratorsRelations = relations(reelCollaborators, ({one}) => ({
	user: one(users, {
		fields: [reelCollaborators.ownerId],
		references: [users.id]
	}),
}));

export const challengeParticipantsRelations = relations(challengeParticipants, ({one}) => ({
	challenge: one(challenges, {
		fields: [challengeParticipants.challengeId],
		references: [challenges.id]
	}),
	user: one(users, {
		fields: [challengeParticipants.userId],
		references: [users.id]
	}),
}));

export const reelWatchProgressRelations = relations(reelWatchProgress, ({one}) => ({
	reel: one(reels, {
		fields: [reelWatchProgress.reelId],
		references: [reels.id]
	}),
	user: one(users, {
		fields: [reelWatchProgress.userId],
		references: [users.id]
	}),
}));

export const userStreaksRelations = relations(userStreaks, ({one}) => ({
	user: one(users, {
		fields: [userStreaks.userId],
		references: [users.id]
	}),
}));

export const growTogetherGoalsRelations = relations(growTogetherGoals, ({one}) => ({
	user: one(users, {
		fields: [growTogetherGoals.userId],
		references: [users.id]
	}),
}));

export const growTogetherConnectionsRelations = relations(growTogetherConnections, ({one}) => ({
	user_user1Id: one(users, {
		fields: [growTogetherConnections.user1Id],
		references: [users.id],
		relationName: "growTogetherConnections_user1Id_users_id"
	}),
	user_user2Id: one(users, {
		fields: [growTogetherConnections.user2Id],
		references: [users.id],
		relationName: "growTogetherConnections_user2Id_users_id"
	}),
}));

export const reelVersionsRelations = relations(reelVersions, ({one}) => ({
	user: one(users, {
		fields: [reelVersions.editorId],
		references: [users.id]
	}),
	reel: one(reels, {
		fields: [reelVersions.reelId],
		references: [reels.id]
	}),
}));

export const pushTokensRelations = relations(pushTokens, ({one}) => ({
	user: one(users, {
		fields: [pushTokens.userId],
		references: [users.id]
	}),
}));

export const postEmbeddingsRelations = relations(postEmbeddings, ({one}) => ({
	post: one(posts, {
		fields: [postEmbeddings.postId],
		references: [posts.id]
	}),
}));

export const userInterestProfilesRelations = relations(userInterestProfiles, ({one}) => ({
	user: one(users, {
		fields: [userInterestProfiles.userId],
		references: [users.id]
	}),
}));

export const userBlocksRelations = relations(userBlocks, ({one}) => ({
	user_blockedId: one(users, {
		fields: [userBlocks.blockedId],
		references: [users.id],
		relationName: "userBlocks_blockedId_users_id"
	}),
	user_blockerId: one(users, {
		fields: [userBlocks.blockerId],
		references: [users.id],
		relationName: "userBlocks_blockerId_users_id"
	}),
}));

export const storyReactionsRelations = relations(storyReactions, ({one}) => ({
	story: one(stories, {
		fields: [storyReactions.storyId],
		references: [stories.id]
	}),
	user: one(users, {
		fields: [storyReactions.userId],
		references: [users.id]
	}),
}));