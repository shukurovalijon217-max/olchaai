/**
 * Tests for the POST /api/posts/:id/voice-comments guard that blocks
 * base64 DataURL audio payloads from old mobile clients.
 *
 * The route rejects any audioUrl that starts with "data:" with a 400
 * and accepts a valid https:// R2 URL with a 201.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import express from "express";
import request from "supertest";
// ── Module mocks (must come before the route import) ─────────────────────────
// Mock the DB so no real database is hit during tests
vi.mock("@workspace/db", () => {
    // We need chainable query builder stubs:
    //   db.select().from().where()   → for post-existence check + author enrichment
    //   db.insert().values().returning() → for the voice-comment insert
    const makeSelectChain = (rows) => ({
        from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue(rows),
        }),
    });
    const mockDb = {
        // First .select() call checks the post exists → return a post row.
        // Second .select() call (inside enrichVoiceComment) fetches the author → return an author row.
        select: vi
            .fn()
            .mockReturnValueOnce(makeSelectChain([{ id: 1 }])) // post exists
            .mockReturnValue(makeSelectChain([
            {
                id: 42,
                username: "tester",
                displayName: "Tester",
                avatarUrl: null,
                isVerified: false,
            },
        ])),
        insert: vi.fn().mockReturnValue({
            values: vi.fn().mockReturnValue({
                returning: vi.fn().mockResolvedValue([
                    {
                        id: 99,
                        postId: 1,
                        authorId: 42,
                        audioUrl: "https://pub.example.r2.dev/voice/test.webm",
                        durationMs: 5000,
                        waveformData: null,
                        createdAt: new Date().toISOString(),
                    },
                ]),
            }),
        }),
    };
    return {
        db: mockDb,
        voiceCommentsTable: {},
        usersTable: {},
        postsTable: {},
        eq: vi.fn(),
        desc: vi.fn(),
    };
});
// Mock R2 storage — not exercised in these tests but imported by the module
vi.mock("../lib/r2Storage", () => ({
    isR2Enabled: vi.fn().mockReturnValue(true),
    r2GetPresignedUploadUrl: vi.fn(),
}));
// ── Helpers ───────────────────────────────────────────────────────────────────
function buildTestApp() {
    const app = express();
    app.use(express.json());
    // Inject a fake authenticated session so requireAuth passes
    app.use((req, _res, next) => {
        req.session = { userId: 42 };
        // Provide a minimal pino-like logger so req.log.error() doesn't throw
        req.log = { error: () => { }, warn: () => { }, info: () => { }, debug: () => { } };
        next();
    });
    // We import the router dynamically after mocks are registered
    return app;
}
// ── Tests ─────────────────────────────────────────────────────────────────────
describe("POST /api/posts/:id/voice-comments — base64 audio guard", () => {
    let app;
    beforeEach(async () => {
        vi.clearAllMocks();
        // Re-reset the db.select chain for each test so call order is predictable
        const { db } = await import("@workspace/db");
        const makeSelectChain = (rows) => ({
            from: vi.fn().mockReturnValue({
                where: vi.fn().mockResolvedValue(rows),
            }),
        });
        db.select
            .mockReset()
            .mockReturnValueOnce(makeSelectChain([{ id: 1 }])) // post exists
            .mockReturnValue(makeSelectChain([
            {
                id: 42,
                username: "tester",
                displayName: "Tester",
                avatarUrl: null,
                isVerified: false,
            },
        ]));
        app = buildTestApp();
        const { default: voiceCommentsRouter } = await import("./voiceComments.js");
        app.use("/api", voiceCommentsRouter);
    });
    it("returns 400 when audioUrl is a base64 DataURL (data:audio/webm;base64,...)", async () => {
        const base64Payload = "data:audio/webm;base64,GkXfo59ChoEBQveBAULygQRC84EIQoKEd2VibUKHgQRChYECGFOAZwH//////////";
        const res = await request(app)
            .post("/api/posts/1/voice-comments")
            .set("Content-Type", "application/json")
            .send({ audioUrl: base64Payload, durationMs: 3000 });
        expect(res.status).toBe(400);
        expect(res.body).toMatchObject({ error: expect.stringContaining("Base64") });
    });
    it("returns 400 for any data: scheme prefix (e.g. data:audio/ogg;base64,...)", async () => {
        const oggBase64 = "data:audio/ogg;base64,T2dnUwACAAAAAAAAAAA=";
        const res = await request(app)
            .post("/api/posts/1/voice-comments")
            .set("Content-Type", "application/json")
            .send({ audioUrl: oggBase64, durationMs: 1000 });
        expect(res.status).toBe(400);
        expect(res.body).toMatchObject({ error: expect.stringContaining("Base64") });
    });
    it("returns 201 when audioUrl is a valid https:// R2 URL", async () => {
        const r2Url = "https://pub.example.r2.dev/voice/abc123.webm";
        const res = await request(app)
            .post("/api/posts/1/voice-comments")
            .set("Content-Type", "application/json")
            .send({ audioUrl: r2Url, durationMs: 5000 });
        // The key assertion: a valid https:// URL is NOT rejected with 400/401/etc.
        expect(res.status).toBe(201);
        // The response body should contain the inserted voice comment record
        expect(res.body).toMatchObject({ id: expect.any(Number) });
    });
});
