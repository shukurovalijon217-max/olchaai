---
name: Voice Comments
description: "Ovozli Iplari" — voice threading feature; DB schema, API routes, and frontend VoiceRecorder component.
---

## Rule
Voice comments are stored in `voice_comments` table. The API route is NOT in OpenAPI spec — it's a plain Express router added directly to routes/index.ts like other non-codegen routes.

**Why:** Adding to OpenAPI spec would require Orval codegen and schema updates; voice comments are a first-party feature with a direct route.

## How to apply
- DB table: `voice_comments` in `lib/db/src/schema/voiceComments.ts` — exported from `lib/db/src/schema/index.ts`
- API: `artifacts/api-server/src/routes/voiceComments.ts` — GET/POST/DELETE `/api/posts/:id/voice-comments`
- Frontend: `VoiceRecorder.tsx` uses MediaRecorder API + waveform visualization; max 10 seconds; uploads via `useMediaUpload` hook
- Waveform stored as JSON string (`waveformData` field) for playback visualization
- MIME type: tries `audio/webm;codecs=opus` first, falls back to `audio/webm` then `audio/ogg`
