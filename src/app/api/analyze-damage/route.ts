import { NextRequest, NextResponse } from "next/server";
import { analyzeDamageFromPhotos } from "@/lib/damage-analyzer";
import type { VehicleInfo } from "@/lib/damage-analyzer";
import sharp from "sharp";

const IS_DEV = process.env.NODE_ENV !== "production";
const MAX_FILES = 3;
const MAX_FILE_BYTES = 8 * 1024 * 1024;
const ANALYZE_TIMEOUT_MS = 25000;

type AnalysisQuality = "low" | "medium" | "high";

function getAnalysisQuality(confidences: number[]): AnalysisQuality {
  if (confidences.length === 0) return "low";

  const maxConf = Math.max(...confidences);
  const strongCount = confidences.filter(conf => conf >= 0.75).length;

  if (maxConf >= 0.85 || strongCount >= 2) return "high";
  if (maxConf >= 0.65) return "medium";
  return "low";
}

export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID();

  try {
    const contentType = request.headers.get("content-type") || "";
    if (!contentType.includes("multipart/form-data")) {
      return NextResponse.json(
        { error: "Expected multipart/form-data", requestId },
        { status: 400 }
      );
    }

    const form = await request.formData();
    const files = form.getAll("photos").filter((entry): entry is File => entry instanceof File);
    const vehicleRaw = form.get("vehicleInfo");
    let vehicleInfo: VehicleInfo | undefined;
    if (typeof vehicleRaw === "string") {
      try {
        vehicleInfo = JSON.parse(vehicleRaw) as VehicleInfo;
      } catch {
        vehicleInfo = undefined;
      }
    }

    if (files.length === 0) {
      return NextResponse.json(
        { error: "At least one image is required", requestId },
        { status: 400 }
      );
    }

    if (files.length > MAX_FILES) {
      return NextResponse.json(
        { error: `Maximum ${MAX_FILES} images allowed`, requestId },
        { status: 400 }
      );
    }

    for (const file of files) {
      if (!file.type.startsWith("image/")) {
        return NextResponse.json(
          { error: "All uploaded files must be images", requestId },
          { status: 400 }
        );
      }

      if (file.size > MAX_FILE_BYTES) {
        return NextResponse.json(
          { error: "Each image must be 8MB or smaller", requestId },
          { status: 400 }
        );
      }
    }

    const limitedFiles = files.slice(0, MAX_FILES);
    const images = await Promise.all(
      limitedFiles.map(async file => {
        const buffer = Buffer.from(await file.arrayBuffer());
        const jpeg = await sharp(buffer)
          .rotate()
          .resize(1280, 1280, { fit: "inside", withoutEnlargement: true })
          .jpeg({ quality: 82 })
          .toBuffer();
        return jpeg.toString("base64");
      })
    );

    if (IS_DEV) {
      console.log(`[analyze-damage][${requestId}] Received`, images.length, "image(s)", vehicleInfo ? `vehicle: ${vehicleInfo.year} ${vehicleInfo.make} ${vehicleInfo.model}` : "(no vehicle info)");
    }

    const racedResult = await Promise.race([
      analyzeDamageFromPhotos(images, vehicleInfo)
        .then(result => ({ type: "ok" as const, result }))
        .catch(error => ({ type: "error" as const, error })),
      new Promise<{ type: "timeout" }>(resolve => {
        setTimeout(() => resolve({ type: "timeout" }), ANALYZE_TIMEOUT_MS);
      }),
    ]);

    if (racedResult.type === "timeout") {
      if (IS_DEV) {
        console.warn(`[analyze-damage][${requestId}] Claude timed out after ${ANALYZE_TIMEOUT_MS}ms`);
      }
      return NextResponse.json({
        success: true,
        requestId,
        detections: [],
        method: "claude_vision",
        photo_count: images.length,
        analysis_quality: "low" as AnalysisQuality,
        degraded: true,
      });
    }

    if (racedResult.type === "error") {
      console.error(`[analyze-damage][${requestId}] Analyzer error:`, racedResult.error);
      return NextResponse.json({
        success: true,
        requestId,
        detections: [],
        method: "claude_vision",
        photo_count: images.length,
        analysis_quality: "low" as AnalysisQuality,
        degraded: true,
      });
    }

    const filteredDetections = racedResult.result.detections
      .filter(detection => detection.confidence >= 0.45)
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 8);

    const analysisQuality = getAnalysisQuality(filteredDetections.map(detection => detection.confidence));

    return NextResponse.json({
      success: true,
      requestId,
      ...racedResult.result,
      detections: filteredDetections,
      analysis_quality: analysisQuality,
      degraded: false,
    });
  } catch (e) {
    console.error(`[analyze-damage][${requestId}] Error:`, e);
    return NextResponse.json(
      { error: "Failed to analyze damage", requestId },
      { status: 500 }
    );
  }
}
