import fs from "node:fs";
import OpenAI, { toFile } from "openai";
import { Buffer } from "node:buffer";

if (!process.env.OPENAI_API_KEY) {
  throw new Error("OPENAI_API_KEY must be set.");
}

export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function generateImageUrl(
  prompt: string,
  size: "1024x1024" | "1792x1024" | "1024x1792" = "1024x1024"
): Promise<string> {
  const response = await openai.images.generate({
    model: "gpt-image-1",
    prompt,
    size,
    n: 1,
  } as Parameters<typeof openai.images.generate>[0]);

  const item = (response.data ?? [])[0] as { url?: string; b64_json?: string } | undefined;
  if (item?.url) return item.url;
  if (item?.b64_json) return `data:image/png;base64,${item.b64_json}`;
  throw new Error("No image returned from OpenAI");
}

export async function generateImageBuffer(
  prompt: string,
  size: "1024x1024" | "512x512" | "256x256" = "1024x1024"
): Promise<Buffer> {
  const result = await generateImageUrl(
    prompt,
    size === "512x512" || size === "256x256" ? "1024x1024" : size
  );
  if (result.startsWith("data:")) {
    const base64 = result.split(",")[1] ?? "";
    return Buffer.from(base64, "base64");
  }
  const res = await fetch(result);
  if (!res.ok) throw new Error(`Failed to download image: ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

export async function editImages(
  imageFiles: string[],
  prompt: string,
  outputPath?: string
): Promise<Buffer> {
  const images = await Promise.all(
    imageFiles.map((file) =>
      toFile(fs.createReadStream(file), file, { type: "image/png" })
    )
  );
  const response = await openai.images.edit({
    model: "dall-e-2",
    image: images[0],
    prompt,
  });
  const imageBase64 = (response.data ?? [])[0]?.b64_json ?? "";
  const imageBytes = Buffer.from(imageBase64, "base64");
  if (outputPath) fs.writeFileSync(outputPath, imageBytes);
  return imageBytes;
}
