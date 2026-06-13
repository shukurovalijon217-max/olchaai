/*
  Quantum Voice Translator
  Whisper STT → voice-profile analysis → GPT-4o translation (style-preserving)
  → OpenAI TTS with matching voice persona.

  The "quantum" aspect: we extract the speaker's stylistic DNA
  (tone, pace, formality, energy) and inject it into both
  the translation prompt AND the TTS voice selection.
*/
import { Router } from "express";
import { openai } from "@workspace/integrations-openai-ai-server";

const router = Router();

type TtsVoice = "alloy" | "echo" | "fable" | "onyx" | "nova" | "shimmer";

interface VoiceProfile {
  detectedLang: string;
  formality: "formal" | "casual" | "mixed";
  energy: "calm" | "moderate" | "energetic";
  sentiment: "neutral" | "positive" | "concerned";
  ttsVoice: TtsVoice;
  styleHint: string;
}

/* Map voice profile → OpenAI TTS voice */
function selectTtsVoice(profile: Partial<VoiceProfile>): TtsVoice {
  if (profile.energy === "energetic" && profile.formality === "casual") return "nova";
  if (profile.energy === "calm" && profile.formality === "formal") return "onyx";
  if (profile.energy === "moderate" && profile.formality === "formal") return "alloy";
  if (profile.sentiment === "positive") return "shimmer";
  if (profile.energy === "calm") return "echo";
  return "fable";
}

router.post("/voice/translate", async (req, res) => {
  if (!req.session.userId) { res.status(401).json({ error: "Unauthorized" }); return; }

  const { audioBase64, targetLang = "en", sourceLang } = req.body as {
    audioBase64: string;
    targetLang?: string;
    sourceLang?: string;
  };

  if (!audioBase64) { res.status(400).json({ error: "audioBase64 required" }); return; }

  try {
    /* ── Step 1: Whisper STT ─────────────────────────────────── */
    const buffer = Buffer.from(audioBase64, "base64");
    const file = new File([buffer], "audio.webm", { type: "audio/webm" });

    const transcription = await openai.audio.transcriptions.create({
      model: "whisper-1",
      file,
      language: sourceLang || undefined,
      response_format: "verbose_json",
    });

    const originalText = (transcription as { text: string }).text?.trim() ?? "";
    const detectedLang = (transcription as { language?: string }).language ?? sourceLang ?? "uz";

    if (!originalText) {
      res.json({
        success: false,
        error: "Ovoz aniqlanmadi",
        originalText: "",
        translatedText: "",
        audioBase64: null,
        voiceProfile: null,
      });
      return;
    }

    /* ── Step 2: Voice-style analysis ───────────────────────── */
    const profileRes = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      max_completion_tokens: 120,
      messages: [{
        role: "system",
        content: "Analyze the speaking style of this text. Return ONLY valid JSON: {"
          + '"formality":"formal|casual|mixed",'
          + '"energy":"calm|moderate|energetic",'
          + '"sentiment":"neutral|positive|concerned",'
          + '"styleHint":"1 sentence describing the speaker\'s voice style"'
          + "}",
      }, {
        role: "user",
        content: `Text (${detectedLang}): "${originalText}"`,
      }],
    });

    let profile: VoiceProfile;
    try {
      const raw = profileRes.choices[0]?.message?.content ?? "{}";
      const parsed = JSON.parse(raw.replace(/```json\n?|\n?```/g, "")) as Partial<VoiceProfile>;
      profile = {
        detectedLang,
        formality: parsed.formality ?? "mixed",
        energy: parsed.energy ?? "moderate",
        sentiment: parsed.sentiment ?? "neutral",
        styleHint: parsed.styleHint ?? "",
        ttsVoice: selectTtsVoice(parsed),
      };
    } catch {
      profile = { detectedLang, formality: "mixed", energy: "moderate", sentiment: "neutral", styleHint: "", ttsVoice: "alloy" };
    }

    /* ── Step 3: Style-preserving translation ────────────────── */
    const langNames: Record<string, string> = {
      en: "English", uz: "Uzbek", ru: "Russian", zh: "Chinese",
      ar: "Arabic", es: "Spanish", fr: "French", de: "German",
      ja: "Japanese", ko: "Korean", tr: "Turkish", hi: "Hindi",
      it: "Italian", pt: "Portuguese", fa: "Persian",
    };
    const targetLangName = langNames[targetLang] ?? targetLang;

    const translationRes = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      max_completion_tokens: 500,
      messages: [{
        role: "system",
        content: `You are a professional voice cloning translator. 
Translate the given text to ${targetLangName} while PRESERVING the speaker's exact voice personality:
- Formality: ${profile.formality}
- Energy: ${profile.energy}
- Sentiment: ${profile.sentiment}
- Style: ${profile.styleHint}

Rules:
1. Preserve ALL emotional nuances, rhythm, and energy exactly
2. If the original is casual, stay casual. If formal, stay formal
3. Preserve pauses (represented by "..." or commas) exactly
4. Do NOT add formalities or soften the tone
5. Return ONLY the translated text, nothing else`,
      }, {
        role: "user",
        content: originalText,
      }],
    });

    const translatedText = translationRes.choices[0]?.message?.content?.trim() ?? "";

    /* ── Step 4: TTS with matched voice ─────────────────────── */
    const ttsRes = await openai.audio.speech.create({
      model: "tts-1-hd",
      voice: profile.ttsVoice,
      input: translatedText,
      response_format: "mp3",
      speed: profile.energy === "energetic" ? 1.1 : profile.energy === "calm" ? 0.9 : 1.0,
    });

    const audioOut = Buffer.from(await ttsRes.arrayBuffer());

    res.json({
      success: true,
      originalText,
      translatedText,
      audioBase64: audioOut.toString("base64"),
      voiceProfile: profile,
      targetLang,
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Tarjima xatosi", details: String(err) });
  }
});

/* ── Text-only translation (no audio in, text out + audio out) ── */
router.post("/voice/translate-text", async (req, res) => {
  if (!req.session.userId) { res.status(401).json({ error: "Unauthorized" }); return; }

  const { text, targetLang = "en", voice = "alloy" } = req.body as {
    text: string; targetLang?: string; voice?: TtsVoice;
  };

  if (!text?.trim()) { res.status(400).json({ error: "text required" }); return; }

  try {
    const langNames: Record<string, string> = {
      en: "English", uz: "Uzbek", ru: "Russian", zh: "Chinese",
      ar: "Arabic", es: "Spanish", fr: "French", de: "German",
      ja: "Japanese", ko: "Korean", tr: "Turkish", hi: "Hindi",
    };
    const targetLangName = langNames[targetLang] ?? targetLang;

    const [translationRes, ] = await Promise.all([
      openai.chat.completions.create({
        model: "gpt-4o-mini",
        max_completion_tokens: 400,
        messages: [
          { role: "system", content: `Translate to ${targetLangName}. Return only the translation, nothing else.` },
          { role: "user", content: text },
        ],
      }),
    ]);

    const translated = translationRes.choices[0]?.message?.content?.trim() ?? "";

    const ttsRes = await openai.audio.speech.create({
      model: "tts-1-hd",
      voice,
      input: translated,
      response_format: "mp3",
    });

    const audioBuffer = Buffer.from(await ttsRes.arrayBuffer());

    res.json({
      originalText: text,
      translatedText: translated,
      audioBase64: audioBuffer.toString("base64"),
      targetLang,
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Tarjima xatosi" });
  }
});

export default router;
