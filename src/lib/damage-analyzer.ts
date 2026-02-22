import Anthropic from "@anthropic-ai/sdk";
import sharp from "sharp";
import { DAMAGE_AREAS } from "./damage-options";

export interface VehicleInfo {
  year: string;
  make: string;
  model: string;
}

export interface DamageDetection {
  damage_id: string;
  area: string;
  type_label: string;
  severity: "minor" | "moderate" | "severe";
  confidence: number;
  reason: string;
}

export interface AnalysisResult {
  detections: DamageDetection[];
  method: "claude_vision";
  photo_count: number;
}

function findDamageMeta(id: string): { damage_id: string; area: string; type_label: string } | null {
  for (const area of DAMAGE_AREAS) {
    const match = area.types.find(type => type.id === id);
    if (match) {
      return { damage_id: id, area: area.area, type_label: match.label };
    }
  }
  return null;
}

function damageIdList(): string {
  return DAMAGE_AREAS.flatMap(area => area.types.map(type => `${type.id}: ${area.area} — ${type.label}`)).join("\n");
}

function buildPrompt(): string {
  return `Inspect these vehicle photos and return ONLY a JSON array.

For each damaged area, return:
- damage_id (must be from list below)
- severity (minor | moderate | severe)
- confidence (0 to 1)
- reason (short plain-English reason)

Only include damage with confidence >= 0.4.
If no clear damage is visible, return []

Valid damage_id values:
${damageIdList()}`;
}

function parseVisionResponse(raw: string): DamageDetection[] {
  const jsonMatch = raw.match(/\[[\s\S]*\]/);
  if (!jsonMatch) return [];

  try {
    const parsed = JSON.parse(jsonMatch[0]) as Array<{
      damage_id?: string;
      severity?: string;
      confidence?: number;
      reason?: string;
    }>;

    return parsed
      .map(item => {
        if (!item.damage_id) return null;
        const meta = findDamageMeta(item.damage_id);
        if (!meta) return null;

        const severity: DamageDetection["severity"] =
          item.severity === "minor" || item.severity === "moderate" || item.severity === "severe"
            ? item.severity
            : "moderate";

        return {
          ...meta,
          severity,
          confidence: Math.min(1, Math.max(0, item.confidence ?? 0.5)),
          reason: item.reason || "Detected from photo",
        };
      })
      .filter((item): item is DamageDetection => item !== null);
  } catch {
    return [];
  }
}

async function enhanceImage(base64Data: string): Promise<string> {
  try {
    const buffer = Buffer.from(base64Data, "base64");
    const enhanced = await sharp(buffer)
      .resize(1280, 1280, { fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 82 })
      .toBuffer();

    return enhanced.toString("base64");
  } catch {
    return base64Data;
  }
}

function makeImageBlock(base64Data: string): Anthropic.Messages.ImageBlockParam {
  return {
    type: "image",
    source: {
      type: "base64",
      media_type: "image/jpeg",
      data: base64Data,
    },
  };
}

async function analyzeWithClaude(images: string[]): Promise<DamageDetection[]> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || images.length === 0) return [];

  const anthropic = new Anthropic({ apiKey });
  const content: Anthropic.Messages.ContentBlockParam[] = [
    ...images.slice(0, 3).map(makeImageBlock),
    { type: "text", text: buildPrompt() },
  ];

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1800,
    messages: [{ role: "user", content }],
  });

  const textBlock = response.content.find(block => block.type === "text");
  if (!textBlock || textBlock.type !== "text") return [];

  return parseVisionResponse(textBlock.text);
}

export async function analyzeDamageFromPhotos(
  imageBase64s: string[],
  _vehicleInfo?: VehicleInfo,
): Promise<AnalysisResult> {
  const preparedImages = await Promise.all(imageBase64s.slice(0, 3).map(enhanceImage));

  try {
    const detections = await analyzeWithClaude(preparedImages);
    return {
      detections,
      method: "claude_vision",
      photo_count: preparedImages.length,
    };
  } catch (error) {
    console.error("[damage-analyzer] Claude analysis failed:", error);
    return {
      detections: [],
      method: "claude_vision",
      photo_count: preparedImages.length,
    };
  }
}
