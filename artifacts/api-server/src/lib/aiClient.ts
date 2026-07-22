/**
 * Smart AI client — Groq-first, OpenAI fallback.
 * Groq: llama-3.3-70b-versatile (3x tezroq, 10x arzonroq).
 * OpenAI: gpt-4o-mini (fallback).
 */
import OpenAI from "openai";

const GROQ_KEY   = process.env["GROQ_API_KEY"];
const OPENAI_KEY = process.env["OPENAI_API_KEY"];

/* Primary: Groq (OpenAI-compatible endpoint) */
const groqClient = GROQ_KEY
  ? new OpenAI({ apiKey: GROQ_KEY, baseURL: "https://api.groq.com/openai/v1" })
  : null;

/* Fallback: OpenAI */
const openaiClient = OPENAI_KEY
  ? new OpenAI({ apiKey: OPENAI_KEY })
  : null;

export const aiClient: OpenAI = (groqClient ?? openaiClient) as OpenAI;

export const AI_MODEL   = GROQ_KEY ? "llama-3.3-70b-versatile" : "gpt-4o-mini";
export const AI_PROVIDER = GROQ_KEY ? "Groq" : "OpenAI";

export const AI_FAST_MODEL = GROQ_KEY ? "llama-3.1-8b-instant" : "gpt-4o-mini";

if (!GROQ_KEY && !OPENAI_KEY) {
  process.stderr.write("[aiClient] WARNING: Neither GROQ_API_KEY nor OPENAI_API_KEY is set!\n");
}

process.stdout.write(`[aiClient] Provider: ${AI_PROVIDER}, Model: ${AI_MODEL}\n`);
