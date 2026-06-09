import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import usersRouter from "./users";
import postsRouter from "./posts";
import reelsRouter from "./reels";
import storiesRouter from "./stories";
import messagesRouter from "./messages";
import groupsRouter from "./groups";
import notificationsRouter from "./notifications";
import aiRouter from "./ai";
import adminRouter from "./admin";
import stripeRouter from "./stripe";
import moderationRouter from "./moderation";
import goRouter from "./go";
import mediaRouter from "./media";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(usersRouter);
router.use(postsRouter);
router.use(reelsRouter);
router.use(storiesRouter);
router.use(messagesRouter);
router.use(groupsRouter);
router.use(notificationsRouter);
router.use(aiRouter);
router.use(adminRouter);
router.use(stripeRouter);
router.use(moderationRouter);
router.use("/go", goRouter);
router.use("/media", mediaRouter);

export default router;
