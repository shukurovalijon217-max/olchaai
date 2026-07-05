---
name: WebRTC calls need TURN, not just STUN
description: STUN-only ICE server config makes 1:1 WebRTC voice/video calls fail to connect for a large share of real users behind mobile-carrier or symmetric NATs.
---

STUN only helps peers discover their public IP/port for direct P2P; it does nothing when either side is behind a NAT that doesn't allow inbound P2P (common on cellular/LTE carriers and many corporate/home routers). In that case ICE negotiation never completes and the call just hangs at "ringing"/"connecting" forever with no error surfaced to the user — it looks like "video calls just don't work."

**Why:** User reported "the video call function doesn't work at all" on a live production social app. Code review of the WebRTC signaling (offer/answer/ICE relay via a WS hub) was logically correct, but the `RTCPeerConnection` was only configured with Google STUN servers — no TURN relay. The WS relay (`hub.sendTo`) also silently drops signaling messages if the target socket isn't currently connected, with no missed-call fallback.

**How to apply:** Any RTCPeerConnection config used for real (not same-LAN-only) calls must include a TURN server (e.g. a relay like open-relay project for quick fixes, or a paid provider like Twilio/Cloudflare/Xirsys for reliability at scale) alongside STUN. Also add a client-side ring timeout (e.g. 30–45s) that auto-cancels an unanswered "ringing_out" call and notifies the caller — otherwise a dropped/never-delivered invite leaves the UI stuck indefinitely with no feedback.
