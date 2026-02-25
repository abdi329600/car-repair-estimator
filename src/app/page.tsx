"use client";

import { useState, useCallback } from "react";
import { DAMAGE_AREAS, VEHICLE_CLASSES } from "@/lib/damage-options";
import { SeverityBadge } from "@/components/SeverityBadge";
import { FlipCalculator } from "@/components/FlipCalculator";
import { FeedbackWidget } from "@/components/FeedbackWidget";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import type { VehicleClass } from "@/lib/damage-options";
import type { EstimateResult, FlipResult } from "@/lib/estimator";
import type { PartsSearchResult } from "@/lib/parts-finder";
import {
  Car, Camera, Wrench, DollarSign, ChevronRight, ChevronDown,
  Trash2, Plus, Search, TrendingUp, AlertTriangle, CheckCircle,
  ShoppingCart, Crown, ExternalLink, Zap, Loader2, Sparkles,
} from "lucide-react";

interface VinData {
  year: string; make: string; model: string; trim: string;
  body_class: string; engine: string;
}

interface DamageEntry {
  id: string;
  damage_id: string;
  area: string;
  type_label: string;
  severity: "minor" | "moderate" | "severe";
}

type Step = 0 | 1 | 2 | 3 | 4;
const STEP_LABELS = ["Vehicle", "Damage", "Estimate", "Parts", "Flip"];
const MAX_PHOTOS = 3;

export default function Home() {
  // Steps — 0=Vehicle, 1=Damage, 2=Estimate, 3=Parts (PRO), 4=Flip
  const [step, setStep] = useState<Step>(0);
  const [userTier] = useState<"free" | "pro">("pro");
  const [showUpgrade, setShowUpgrade] = useState(false);

  // Step 0: Vehicle
  const [vin, setVin] = useState("");
  const [vinData, setVinData] = useState<VinData | null>(null);
  const [vinLoading, setVinLoading] = useState(false);
  const [vinError, setVinError] = useState("");
  const [vehicleClass, setVehicleClass] = useState<VehicleClass>("midsize");
  const [zipCode, setZipCode] = useState("");

  // Step 1: Damage
  const [damages, setDamages] = useState<DamageEntry[]>([]);
  const [expandedArea, setExpandedArea] = useState<string | null>(null);
  const [photos, setPhotos] = useState<{ url: string; file: File }[]>([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResults, setAnalysisResults] = useState<{damage_id: string; area: string; type_label: string; severity: "minor" | "moderate" | "severe"; confidence: number; reason: string}[]>([]);
  const [analysisDegraded, setAnalysisDegraded] = useState(false);
  const [analysisRequestId, setAnalysisRequestId] = useState<string | null>(null);
  const [reviewedAi, setReviewedAi] = useState(false);

  // Step 2: Estimate
  const [estimate, setEstimate] = useState<EstimateResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Step 3: Parts Marketplace (PRO)
  const [partsResults, setPartsResults] = useState<PartsSearchResult[]>([]);
  const [partsLoading, setPartsLoading] = useState(false);

  // Step 4: Flip
  const [purchasePrice, setPurchasePrice] = useState<number>(0);
  const [resaleValue, setResaleValue] = useState<number>(0);
  const [flip, setFlip] = useState<FlipResult | null>(null);

  const decodeVin = useCallback(async () => {
    if (vin.length !== 17) { setVinError("VIN must be 17 characters"); return; }
    setVinLoading(true); setVinError("");
    try {
      const res = await fetch(`/api/vin?vin=${vin}`);
      const data = await res.json();
      if (data.error) { setVinError(data.error); return; }
      setVinData(data);
      const bc = (data.body_class || "").toLowerCase();
      if (bc.includes("truck") || bc.includes("pickup")) setVehicleClass("truck");
      else if (bc.includes("suv") || bc.includes("sport utility")) setVehicleClass("suv");
      else if (bc.includes("sedan") && data.make?.match(/bmw|mercedes|lexus|audi|porsche/i)) setVehicleClass("luxury");
      else if (bc.includes("coupe") || bc.includes("compact") || bc.includes("hatchback")) setVehicleClass("compact");
      else setVehicleClass("midsize");
    } catch { setVinError("Failed to decode VIN"); }
    finally { setVinLoading(false); }
  }, [vin]);

  const addDamage = (areaName: string, damageId: string, typeLabel: string) => {
    if (damages.find(d => d.damage_id === damageId)) return;
    setDamages(prev => [...prev, {
      id: crypto.randomUUID(),
      damage_id: damageId,
      area: areaName,
      type_label: typeLabel,
      severity: "moderate",
    }]);
  };

  const removeDamage = (id: string) => setDamages(prev => prev.filter(d => d.id !== id));

  const setSeverity = (id: string, severity: DamageEntry["severity"]) => {
    setDamages(prev => prev.map(d => d.id === id ? { ...d, severity } : d));
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (analyzing) return;

    const files = e.target.files;
    if (!files || files.length === 0) return;

    const fileList = Array.from(files);
    const availableSlots = Math.max(0, MAX_PHOTOS - photos.length);
    if (availableSlots === 0) {
      e.target.value = "";
      return;
    }

    const acceptedFiles = fileList.slice(0, availableSlots);

    // Phase 1: Instant — create object URLs and show thumbnails (zero heavy work)
    const newPhotos = acceptedFiles.map(file => ({
      url: URL.createObjectURL(file),
      file,
    }));
    setPhotos(prev => [...prev, ...newPhotos]);

    // Analyze on server with simple multipart upload
    setAnalyzing(true);
    setAnalysisResults([]);
    setAnalysisDegraded(false);
    setAnalysisRequestId(null);
    setReviewedAi(false);

    try {
      const combined = [...photos, ...newPhotos].slice(0, MAX_PHOTOS);
      const form = new FormData();
      combined.forEach(photo => form.append("photos", photo.file));

      if (vinData?.year && vinData?.make && vinData?.model) {
        form.append("vehicleInfo", JSON.stringify({
          year: vinData.year,
          make: vinData.make,
          model: vinData.model,
        }));
      }

      const res = await fetch("/api/analyze-damage", {
        method: "POST",
        body: form,
      });

      const data = await res.json();
      if (typeof data.requestId === "string") {
        setAnalysisRequestId(data.requestId);
      }

      if (!res.ok) {
        const msg = typeof data.error === "string" ? data.error : "Failed to analyze damage";
        setError(data.requestId ? `${msg} (Request ID: ${data.requestId})` : msg);
        return;
      }

      setAnalysisDegraded(Boolean(data.degraded));
      if (data.degraded) {
        console.log("[analyze-damage][DEGRADED]", data.requestId, data.analysis_quality ?? "low");
      }
      if (data.success && Array.isArray(data.detections)) {
        setAnalysisResults(data.detections);
        setReviewedAi(data.detections.length === 0);
      }
    } catch (err) {
      console.error("[photo-upload] API call failed:", err);
      setError("Failed to analyze damage");
    } finally {
      setAnalyzing(false);
    }

    e.target.value = "";
  };

  const acceptSuggestion = (suggestion: { damage_id: string; area: string; type_label: string; severity: "minor" | "moderate" | "severe" }) => {
    // Don't add duplicates
    if (damages.some(d => d.damage_id === suggestion.damage_id)) return;
    setDamages(prev => [...prev, {
      id: crypto.randomUUID(),
      damage_id: suggestion.damage_id,
      area: suggestion.area,
      type_label: suggestion.type_label,
      severity: suggestion.severity,
    }]);
    // Remove from suggestions
    setAnalysisResults(prev => prev.filter(r => r.damage_id !== suggestion.damage_id));
  };

  const acceptAllSuggestions = () => {
    const existingIds = new Set(damages.map(d => d.damage_id));
    const newDamages = analysisResults
      .filter(r => !existingIds.has(r.damage_id))
      .map(r => ({
        id: crypto.randomUUID(),
        damage_id: r.damage_id,
        area: r.area,
        type_label: r.type_label,
        severity: r.severity,
      }));
    setDamages(prev => [...prev, ...newDamages]);
    setAnalysisResults([]);
  };

  const runEstimate = async () => {
    if (damages.length === 0) { setError("Add at least one damage item"); return; }
    setLoading(true); setError("");
    try {
      const res = await fetch("/api/estimate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          damages: damages.map(d => ({ damage_id: d.damage_id, severity: d.severity })),
          vehicle_class: vehicleClass,
          purchase_price: purchasePrice || undefined,
          resale_value: resaleValue || undefined,
          zip_code: zipCode || undefined,
        }),
      });
      const data = await res.json();
      if (data.error) { setError(data.error); return; }
      setEstimate(data.estimate);
      setFlip(data.flip);
      setStep(2);
    } catch { setError("Failed to calculate estimate"); }
    finally { setLoading(false); }
  };

  const runFlip = async () => {
    if (!estimate) return;
    setLoading(true);
    try {
      const res = await fetch("/api/estimate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          damages: damages.map(d => ({ damage_id: d.damage_id, severity: d.severity })),
          vehicle_class: vehicleClass,
          zip_code: zipCode || undefined,
          purchase_price: purchasePrice,
          resale_value: resaleValue,
        }),
      });
      const data = await res.json();
      setFlip(data.flip);
      setStep(4);
    } catch { setError("Failed to calculate flip"); }
    finally { setLoading(false); }
  };

  // ─── Parts Search (PRO) ───
  const searchParts = async () => {
    if (userTier !== "pro") { setShowUpgrade(true); return; }
    if (!estimate) return;
    setPartsLoading(true);
    try {
      const parts = estimate.line_items.map(item => ({ damage_id: item.damage_id, part_name: item.part_name }));
      const year = vinData?.year || "";
      const make = vinData?.make || "";
      const model = vinData?.model || "";
      const res = await fetch("/api/parts-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ parts, year, make, model }),
      });
      const data = await res.json();
      if (data.results) setPartsResults(data.results);
      setStep(3);
    } catch { setError("Parts search failed"); }
    finally { setPartsLoading(false); }
  };

  const resetAll = () => {
    // Revoke object URLs before clearing
    photos.forEach(p => URL.revokeObjectURL(p.url));
    setStep(0); setDamages([]); setEstimate(null); setFlip(null); setPhotos([]);
    setVinData(null); setVin(""); setZipCode(""); setPurchasePrice(0); setResaleValue(0);
    setPartsResults([]); setError(""); setAnalysisResults([]);
    setAnalysisDegraded(false); setAnalysisRequestId(null); setReviewedAi(false);
  };

  const fmt = (n: number) => "$" + n.toLocaleString();

  return (
    <ErrorBoundary onReset={resetAll}>
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b border-zinc-800 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-orange-600 flex items-center justify-center">
              <Car className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">AutoFlip</h1>
              <p className="text-[10px] text-zinc-500 -mt-0.5">Shazam for Car Repairs</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {[0,1,2,3,4].map(s => {
              const isPro = s === 3;
              return (
                <button key={s} onClick={() => { if (s <= step) setStep(s as Step); }}
                  className={`h-7 px-2 rounded-lg text-[10px] font-bold transition flex items-center gap-1 ${step === s ? "bg-orange-600 text-white" : step > s ? "bg-zinc-800 text-orange-400" : "bg-zinc-900 text-zinc-600"} ${isPro && userTier === "free" ? "opacity-60" : ""}`}>
                  {isPro && <Crown className="w-2.5 h-2.5" />}
                  {STEP_LABELS[s]}
                </button>
              );
            })}
            {userTier === "free" && (
              <button onClick={() => setShowUpgrade(true)} className="ml-2 bg-gradient-to-r from-amber-600 to-orange-600 text-white text-[10px] font-bold px-3 py-1.5 rounded-lg hover:from-amber-500 hover:to-orange-500 transition flex items-center gap-1">
                <Zap className="w-3 h-3" /> PRO
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8">
        {error && (
          <div className="bg-red-900/30 border border-red-800 rounded-xl px-4 py-3 text-sm text-red-300 mb-6 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            {error}
            <button onClick={() => setError("")} className="ml-auto text-red-500 hover:text-red-300">✕</button>
          </div>
        )}

        {/* ═══ STEP 0: VEHICLE ═══ */}
        {step === 0 && (
          <div className="space-y-6 animate-in fade-in">
            <div>
              <h2 className="text-2xl font-bold text-white mb-1">Step 1: Vehicle Info</h2>
              <p className="text-sm text-zinc-500">Enter VIN for auto-detect, or pick vehicle class manually.</p>
            </div>

            {/* VIN Decode */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
              <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">VIN Number (optional)</label>
              <div className="flex gap-2">
                <input
                  value={vin} onChange={e => setVin(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 17))}
                  placeholder="e.g. 1HGBH41JXMN109186"
                  className="flex-1 bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-sm font-mono text-white placeholder:text-zinc-600 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500/30"
                />
                <button onClick={decodeVin} disabled={vinLoading || vin.length !== 17}
                  className="bg-orange-600 text-white px-5 py-3 rounded-xl font-semibold text-sm hover:bg-orange-700 transition disabled:opacity-40 flex items-center gap-2">
                  <Search className="w-4 h-4" />
                  {vinLoading ? "..." : "Decode"}
                </button>
              </div>
              {vinError && <p className="text-red-400 text-xs mt-2">{vinError}</p>}
              {vinData && (
                <div className="mt-4 bg-zinc-800/50 rounded-xl p-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {[
                    ["Year", vinData.year], ["Make", vinData.make], ["Model", vinData.model],
                    ["Trim", vinData.trim], ["Body", vinData.body_class], ["Engine", vinData.engine],
                  ].map(([k, v]) => v ? (
                    <div key={k}><span className="text-[10px] text-zinc-500 uppercase">{k}</span><div className="text-sm font-semibold text-white">{v}</div></div>
                  ) : null)}
                </div>
              )}
            </div>

            {/* Vehicle Class */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
              <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">Vehicle Class</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {VEHICLE_CLASSES.map(vc => (
                  <button key={vc.value} onClick={() => setVehicleClass(vc.value)}
                    className={`text-left px-4 py-3 rounded-xl border text-sm transition ${vehicleClass === vc.value
                      ? "bg-orange-600/10 border-orange-500 text-orange-300"
                      : "bg-zinc-800/50 border-zinc-700 text-zinc-400 hover:border-zinc-600"}`}>
                    {vc.label}
                  </button>
                ))}
              </div>
            </div>

            {/* ZIP Code (optional — for regional pricing) */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
              <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">ZIP Code (optional)</label>
              <p className="text-[10px] text-zinc-600 mb-3">Adjusts labor rates to your region. Leave blank for national average.</p>
              <input
                value={zipCode}
                onChange={e => setZipCode(e.target.value.replace(/\D/g, "").slice(0, 5))}
                placeholder="e.g. 90210"
                className="w-40 bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-sm font-mono text-white placeholder:text-zinc-600 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500/30"
              />
            </div>

            <button onClick={() => setStep(1)}
              className="w-full bg-orange-600 text-white py-3.5 rounded-xl font-bold text-sm hover:bg-orange-700 transition flex items-center justify-center gap-2">
              Next: Tag Damage <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* ═══ STEP 1: DAMAGE TAGGING ═══ */}
        {step === 1 && (
          <div className="space-y-6 animate-in fade-in">
            <div>
              <h2 className="text-2xl font-bold text-white mb-1">Step 2: Tag Damage</h2>
              <p className="text-sm text-zinc-500">Select damaged areas and severity. Upload photos for reference.</p>
            </div>

            {/* Photo Upload */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
              <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">
                <Camera className="w-3.5 h-3.5 inline mr-1" /> Photos (optional)
              </label>
              <div className="flex flex-wrap gap-3">
                {photos.map((p, i) => (
                  <div key={p.url} className="relative w-24 h-24 rounded-xl overflow-hidden border border-zinc-700">
                    <img src={p.url} alt={`Photo ${i+1}`} className="w-full h-full object-cover" />
                    <button type="button" onClick={() => {
                      URL.revokeObjectURL(p.url);
                      setPhotos(prev => prev.filter((_, j) => j !== i));
                    }}
                      className="absolute top-1 right-1 bg-black/60 rounded-full p-1 hover:bg-red-900"><Trash2 className="w-3 h-3 text-red-400" /></button>
                  </div>
                ))}
                <label className="w-24 h-24 rounded-xl border-2 border-dashed border-zinc-700 flex flex-col items-center justify-center cursor-pointer hover:border-orange-500 transition">
                  <Plus className="w-5 h-5 text-zinc-500" />
                  <span className="text-[10px] text-zinc-500 mt-1">Add</span>
                  <input type="file" accept="image/*" multiple onChange={handlePhotoUpload} className="hidden" disabled={analyzing} />
                </label>
              </div>
              <div className="mt-3 bg-blue-950/30 border border-blue-500/20 rounded-lg p-3">
                <p className="text-[10px] font-semibold text-blue-300 mb-1.5">📸 Photo Tips for Best AI Results</p>
                <ul className="text-[10px] text-zinc-400 space-y-0.5">
                  <li>• Take photos in good lighting (outdoors or bright garage)</li>
                  <li>• Get close to damaged areas — fill the frame with the damage</li>
                  <li>• Multiple angles of the same damage improves accuracy</li>
                  <li>• Slightly blurry is OK — AI can still detect damage</li>
                </ul>
              </div>
            </div>

            {/* AI Damage Analysis Results */}
            {analyzing && (
              <div className="bg-zinc-900 border border-orange-800/30 rounded-2xl p-6">
                <div className="flex items-center gap-3">
                  <Loader2 className="w-5 h-5 text-orange-400 animate-spin" />
                  <div>
                    <div className="text-sm font-semibold text-white">Analyzing photos...</div>
                    <div className="text-[10px] text-zinc-500">Sending up to 3 photos to Claude Vision</div>
                  </div>
                </div>
              </div>
            )}

            {!analyzing && analysisDegraded && (
              <div className="bg-amber-950/30 border border-amber-700/50 rounded-xl px-4 py-3 text-xs text-amber-200">
                AI timed out or is temporarily unavailable — continue with manual tagging.
                {analysisRequestId && <span className="block text-[10px] text-amber-400 mt-1">Request ID: {analysisRequestId}</span>}
              </div>
            )}

            {!analyzing && analysisResults.length > 0 && !reviewedAi && (
              <div className="bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 flex items-center justify-between gap-3">
                <p className="text-xs text-zinc-300">Review AI suggestions before running estimate.</p>
                <button
                  type="button"
                  onClick={() => setReviewedAi(true)}
                  className="text-[11px] bg-zinc-200 text-zinc-900 px-3 py-1.5 rounded-md font-semibold hover:bg-white transition"
                >
                  Mark Reviewed
                </button>
              </div>
            )}

            {!analyzing && analysisResults.length > 0 && (
              <div className="bg-zinc-900 border border-orange-800/50 rounded-2xl overflow-hidden">
                <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-orange-400" />
                    <span className="text-xs font-semibold text-orange-400 uppercase tracking-wider">AI Detected Damage</span>
                    <span className="text-[10px] bg-orange-600/20 text-orange-300 px-1.5 py-0.5 rounded font-bold">{analysisResults.length} found</span>
                  </div>
                  <button onClick={acceptAllSuggestions}
                    className="text-[10px] bg-orange-600 text-white px-3 py-1.5 rounded-lg font-bold hover:bg-orange-700 transition flex items-center gap-1">
                    <Plus className="w-3 h-3" /> Accept All
                  </button>
                </div>
                <div className="divide-y divide-zinc-800/50">
                  {analysisResults.map((r, i) => (
                    <div key={i} className="flex items-center gap-3 px-6 py-3 hover:bg-zinc-800/20 transition">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-white font-medium">{r.area}</span>
                          <SeverityBadge severity={r.severity} />
                          <span className="text-[10px] text-zinc-600 font-mono">{Math.round(r.confidence * 100)}%</span>
                        </div>
                        <div className="text-[10px] text-zinc-500 mt-0.5">{r.type_label} — {r.reason}</div>
                      </div>
                      <div className="flex gap-1.5 shrink-0">
                        <button onClick={() => acceptSuggestion(r)}
                          className="text-[10px] bg-green-900/30 text-green-400 border border-green-800 px-2.5 py-1.5 rounded-lg font-bold hover:bg-green-900/50 transition flex items-center gap-1">
                          <CheckCircle className="w-3 h-3" /> Add
                        </button>
                        <button onClick={() => setAnalysisResults(prev => prev.filter((_, j) => j !== i))}
                          className="text-[10px] bg-zinc-800 text-zinc-500 border border-zinc-700 px-2.5 py-1.5 rounded-lg font-bold hover:text-red-400 hover:border-red-800 transition">
                          Dismiss
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Damage Selector */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
              <div className="px-6 py-4 border-b border-zinc-800">
                <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                  <Wrench className="w-3.5 h-3.5 inline mr-1" /> Select Damaged Areas
                </span>
              </div>
              <div className="divide-y divide-zinc-800/50 max-h-[400px] overflow-y-auto">
                {DAMAGE_AREAS.map(area => {
                  const isExpanded = expandedArea === area.area;
                  const areaCount = damages.filter(d => d.area === area.area).length;
                  return (
                    <div key={area.area}>
                      <button onClick={() => setExpandedArea(isExpanded ? null : area.area)}
                        className="w-full flex items-center justify-between px-6 py-3 hover:bg-zinc-800/30 transition text-left">
                        <div className="flex items-center gap-3">
                          <span className="text-sm text-zinc-200">{area.area}</span>
                          {areaCount > 0 && <span className="text-[10px] bg-orange-600 text-white px-1.5 py-0.5 rounded-full font-bold">{areaCount}</span>}
                        </div>
                        {isExpanded ? <ChevronDown className="w-4 h-4 text-zinc-500" /> : <ChevronRight className="w-4 h-4 text-zinc-500" />}
                      </button>
                      {isExpanded && (
                        <div className="px-6 pb-3 flex flex-wrap gap-2">
                          {area.types.map(t => {
                            const isSelected = damages.some(d => d.damage_id === t.id);
                            return (
                              <button key={t.id} onClick={() => isSelected ? removeDamage(damages.find(d => d.damage_id === t.id)!.id) : addDamage(area.area, t.id, t.label)}
                                className={`text-xs px-3 py-1.5 rounded-lg border transition ${isSelected
                                  ? "bg-orange-600/20 border-orange-500 text-orange-300"
                                  : "bg-zinc-800 border-zinc-700 text-zinc-400 hover:border-zinc-500"}`}>
                                {isSelected && "✓ "}{t.label}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Selected Damages */}
            {damages.length > 0 && (
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Tagged Damage ({damages.length})</span>
                  <button onClick={() => setDamages([])} className="text-[10px] text-red-400 hover:text-red-300">Clear All</button>
                </div>
                <div className="space-y-2">
                  {damages.map(d => (
                    <div key={d.id} className="flex items-center gap-3 bg-zinc-800/50 rounded-xl px-4 py-2.5">
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-white truncate">{d.area}</div>
                        <div className="text-xs text-zinc-500">{d.type_label}</div>
                      </div>
                      <div className="flex gap-1">
                        {(["minor","moderate","severe"] as const).map(s => (
                          <button key={s} onClick={() => setSeverity(d.id, s)}
                            className={`text-[10px] px-2 py-1 rounded-md font-semibold transition ${d.severity === s
                              ? s === "minor" ? "bg-green-900/50 text-green-400 border border-green-700"
                              : s === "moderate" ? "bg-yellow-900/50 text-yellow-400 border border-yellow-700"
                              : "bg-red-900/50 text-red-400 border border-red-700"
                              : "bg-zinc-800 text-zinc-500 border border-zinc-700"}`}>
                            {s.charAt(0).toUpperCase() + s.slice(1)}
                          </button>
                        ))}
                      </div>
                      <button onClick={() => removeDamage(d.id)} className="text-zinc-600 hover:text-red-400 transition">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <button onClick={() => setStep(0)} className="px-6 py-3.5 rounded-xl border border-zinc-700 text-zinc-400 text-sm font-semibold hover:bg-zinc-800 transition">Back</button>
              <button onClick={runEstimate} disabled={damages.length === 0 || loading || (analysisResults.length > 0 && !reviewedAi)}
                className="flex-1 bg-orange-600 text-white py-3.5 rounded-xl font-bold text-sm hover:bg-orange-700 transition disabled:opacity-40 flex items-center justify-center gap-2">
                <DollarSign className="w-4 h-4" />
                {loading ? "Calculating..." : `Get Estimate (${damages.length} items)`}
              </button>
            </div>
          </div>
        )}

        {/* ═══ STEP 2: ESTIMATE ═══ */}
        {step === 2 && estimate && (
          <div className="space-y-6 animate-in fade-in">
            <div>
              <h2 className="text-2xl font-bold text-white mb-1">Step 3: Repair Estimate</h2>
              <p className="text-sm text-zinc-500">
                {vinData ? `${vinData.year} ${vinData.make} ${vinData.model}` : vehicleClass.charAt(0).toUpperCase() + vehicleClass.slice(1)} — {estimate.item_count} repair items
              </p>
            </div>

            {/* Total */}
            <div className="bg-gradient-to-br from-orange-900/30 to-zinc-900 border border-orange-800/50 rounded-2xl p-6">
              <div className="text-xs text-orange-400 uppercase tracking-wider font-semibold mb-2">Estimated Total Repair Cost</div>
              <div className="text-4xl font-bold text-white font-mono">
                {fmt(estimate.total_low)} — {fmt(estimate.total_high)}
              </div>
              <div className="flex gap-6 mt-4 text-xs">
                <div><span className="text-zinc-500">Labor:</span> <span className="text-zinc-300 font-mono">{fmt(estimate.subtotal_labor_low)}–{fmt(estimate.subtotal_labor_high)}</span></div>
                <div><span className="text-zinc-500">Parts:</span> <span className="text-zinc-300 font-mono">{fmt(estimate.subtotal_parts_low)}–{fmt(estimate.subtotal_parts_high)}</span></div>
                <div><span className="text-zinc-500">Paint:</span> <span className="text-zinc-300 font-mono">{fmt(estimate.subtotal_paint_low)}–{fmt(estimate.subtotal_paint_high)}</span></div>
              </div>
              <div className="text-[10px] text-zinc-600 mt-2">
                Shop rate: ${estimate.shop_rate_range[0]}–${estimate.shop_rate_range[1]}/hr (aftermarket parts)
                {estimate.region_name && <span className="ml-2 text-orange-400/70">• {estimate.region_name}</span>}
              </div>
            </div>

            {/* Line Items */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
              <div className="px-6 py-4 border-b border-zinc-800">
                <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Repair Breakdown</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-zinc-500 border-b border-zinc-800">
                      <th className="text-left px-6 py-2.5">Part</th>
                      <th className="text-center px-3 py-2.5">Severity</th>
                      <th className="text-right px-3 py-2.5">Labor</th>
                      <th className="text-right px-3 py-2.5">Parts</th>
                      <th className="text-right px-3 py-2.5">Paint</th>
                      <th className="text-right px-6 py-2.5">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {estimate.line_items.map((item, i) => (
                      <tr key={i} className="border-b border-zinc-800/50 hover:bg-zinc-800/20">
                        <td className="px-6 py-2.5 text-zinc-200 font-medium">{item.part_name}</td>
                        <td className="px-3 py-2.5 text-center">
                          <SeverityBadge severity={item.severity} />
                        </td>
                        <td className="px-3 py-2.5 text-right font-mono text-zinc-400">{fmt(item.labor_cost_low)}–{fmt(item.labor_cost_high)}</td>
                        <td className="px-3 py-2.5 text-right font-mono text-zinc-400">{fmt(item.part_cost_low)}–{fmt(item.part_cost_high)}</td>
                        <td className="px-3 py-2.5 text-right font-mono text-zinc-400">{item.paint_cost_low > 0 ? `${fmt(item.paint_cost_low)}–${fmt(item.paint_cost_high)}` : "—"}</td>
                        <td className="px-6 py-2.5 text-right font-mono font-bold text-white">{fmt(item.total_low)}–{fmt(item.total_high)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Flip Calculator */}
            <FlipCalculator
              purchasePrice={purchasePrice}
              resaleValue={resaleValue}
              onPurchasePriceChange={setPurchasePrice}
              onResaleValueChange={setResaleValue}
              onCalculate={runFlip}
              loading={loading}
            />

            <FeedbackWidget estimateId={`est-${Date.now()}`} />

            <div className="flex gap-3">
              <button onClick={() => setStep(1)} className="px-6 py-3.5 rounded-xl border border-zinc-700 text-zinc-400 text-sm font-semibold hover:bg-zinc-800 transition">Edit Damage</button>
              <button onClick={searchParts} disabled={partsLoading}
                className="flex-1 bg-gradient-to-r from-amber-600 to-orange-600 text-white py-3.5 rounded-xl font-bold text-sm hover:from-amber-500 hover:to-orange-500 transition disabled:opacity-40 flex items-center justify-center gap-2">
                <ShoppingCart className="w-4 h-4" />
                {partsLoading ? "Searching..." : "Find Real Parts Prices"}
                {userTier === "free" && <Crown className="w-3 h-3" />}
              </button>
            </div>
          </div>
        )}

        {/* ═══ STEP 3: PARTS MARKETPLACE (PRO) ═══ */}
        {step === 3 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-white mb-1 flex items-center gap-2">
                Parts Marketplace
                <span className="text-[10px] bg-gradient-to-r from-amber-600 to-orange-600 text-white px-2 py-0.5 rounded font-bold flex items-center gap-0.5"><Crown className="w-2.5 h-2.5" /> PRO</span>
              </h2>
              <p className="text-sm text-zinc-500">Real prices from eBay Motors and RockAuto. Click to buy.</p>
            </div>

            {partsResults.length > 0 ? (
              <div className="space-y-4">
                {partsResults.map((pr, i) => (
                  <div key={i} className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
                    <div className="px-5 py-3 border-b border-zinc-800 flex items-center justify-between">
                      <div>
                        <span className="text-sm font-semibold text-white">{pr.part_name}</span>
                        {pr.ebay_median && pr.ebay_median > 0 && (
                          <span className="ml-2 text-[10px] bg-blue-900/40 text-blue-400 border border-blue-800/50 px-1.5 py-0.5 rounded font-semibold">
                            eBay median {fmt(pr.ebay_median)}
                            {pr.ebay_confidence === "high" ? " ✅" : pr.ebay_confidence === "medium" ? " ~" : " ⚠"}
                          </span>
                        )}
                      </div>
                      {pr.cheapest && <span className="text-xs font-mono font-bold text-green-400">Best: {fmt(pr.cheapest.price)}</span>}
                    </div>
                    {pr.results.length > 0 ? (
                      <div className="divide-y divide-zinc-800/50">
                        {pr.results.slice(0, 5).map((part, j) => (
                          <div key={j} className="flex items-center gap-3 px-5 py-3 hover:bg-zinc-800/30 transition">
                            {part.image_url && <img src={part.image_url} alt="" className="w-12 h-12 rounded-lg object-cover border border-zinc-700 shrink-0" />}
                            <div className="flex-1 min-w-0">
                              <div className="text-xs text-zinc-300 truncate">{part.name}</div>
                              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                {/* Price source badge */}
                                {part.price_source === "live" && (
                                  <span className="text-[10px] px-1.5 py-0.5 rounded font-bold bg-green-900/50 text-green-400 border border-green-800/50">✅ Live</span>
                                )}
                                {part.price_source === "estimated" && (
                                  <span className="text-[10px] px-1.5 py-0.5 rounded font-bold bg-yellow-900/40 text-yellow-400 border border-yellow-800/50">~ Est.</span>
                                )}
                                {part.price_source === "none" && (
                                  <span className="text-[10px] px-1.5 py-0.5 rounded font-bold bg-zinc-800 text-zinc-500">Link</span>
                                )}
                                <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${part.vendor === "ebay" ? "bg-blue-900/50 text-blue-400" : "bg-yellow-900/50 text-yellow-400"}`}>{part.vendor}</span>
                                <span className={`text-[10px] px-1.5 py-0.5 rounded ${part.condition === "new" ? "bg-green-900/50 text-green-400" : part.condition === "used" ? "bg-zinc-700 text-zinc-400" : "bg-purple-900/50 text-purple-400"}`}>{part.condition}</span>
                                {part.shipping > 0 && <span className="text-[10px] text-zinc-500">+{fmt(part.shipping)} ship</span>}
                              </div>
                              {part.note && <div className="text-[10px] text-zinc-600 mt-0.5 truncate">{part.note}</div>}
                            </div>
                            <div className="text-right shrink-0">
                              <div className="text-sm font-mono font-bold text-white">{part.price > 0 ? fmt(part.price) : "See price"}</div>
                              <a href={part.affiliate_url || part.url} target="_blank" rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-[10px] text-orange-400 hover:text-orange-300 font-semibold mt-0.5">
                                {part.price_source === "estimated" ? "Browse" : "Buy"} <ExternalLink className="w-2.5 h-2.5" />
                              </a>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="px-5 py-4 text-xs text-zinc-500">No marketplace results found. Try searching manually.</div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 text-center">
                <ShoppingCart className="w-8 h-8 text-zinc-600 mx-auto mb-3" />
                <p className="text-sm text-zinc-400">No parts data loaded yet.</p>
                <p className="text-xs text-zinc-600 mt-1">Go back to the estimate and click &quot;Find Real Parts Prices&quot;</p>
              </div>
            )}

            <div className="flex gap-3">
              <button onClick={() => setStep(2)} className="px-6 py-3.5 rounded-xl border border-zinc-700 text-zinc-400 text-sm font-semibold hover:bg-zinc-800 transition">Back to Estimate</button>
              <button onClick={() => { if (purchasePrice && resaleValue) { runFlip(); } else { setStep(4); } }}
                className="flex-1 bg-orange-600 text-white py-3.5 rounded-xl font-bold text-sm hover:bg-orange-700 transition flex items-center justify-center gap-2">
                <TrendingUp className="w-4 h-4" /> Flip Calculator <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ═══ STEP 4: FLIP ANALYSIS ═══ */}
        {step === 4 && (
          <div className="space-y-6 animate-in fade-in">
            <div>
              <h2 className="text-2xl font-bold text-white mb-1">Flip Analysis</h2>
              <p className="text-sm text-zinc-500">Should you buy this car?</p>
            </div>

            {!flip ? (
              /* Flip input form when no flip calculated yet */
              <FlipCalculator
                purchasePrice={purchasePrice}
                resaleValue={resaleValue}
                onPurchasePriceChange={setPurchasePrice}
                onResaleValueChange={setResaleValue}
                onCalculate={runFlip}
                loading={loading}
              />
            ) : (
            <>
            {/* Verdict */}
            <div className={`rounded-2xl p-8 text-center border ${
              flip.verdict === "great_flip" ? "bg-green-900/20 border-green-800/50"
              : flip.verdict === "decent_flip" ? "bg-yellow-900/20 border-yellow-800/50"
              : flip.verdict === "break_even" ? "bg-orange-900/20 border-orange-800/50"
              : "bg-red-900/20 border-red-800/50"}`}>
              <div className="text-5xl mb-3">
                {flip.verdict === "great_flip" ? "🔥" : flip.verdict === "decent_flip" ? "👍" : flip.verdict === "break_even" ? "⚠️" : "🚫"}
              </div>
              <div className={`text-2xl font-bold ${flip.verdict_color}`}>{flip.verdict_label}</div>
              <div className="text-4xl font-bold font-mono text-white mt-2">
                {flip.profit_low >= 0 ? "+" : ""}{fmt(flip.profit_low)} to {flip.profit_high >= 0 ? "+" : ""}{fmt(flip.profit_high)}
              </div>
              <div className="text-sm text-zinc-400 mt-1">Projected Profit Range</div>
            </div>

            {/* Breakdown */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
              <div className="space-y-3">
                {[
                  ["Purchase Price", fmt(flip.purchase_price), "text-zinc-300"],
                  ["Repair Cost (Low)", fmt(flip.repair_cost_low), "text-red-400"],
                  ["Repair Cost (High)", fmt(flip.repair_cost_high), "text-red-400"],
                  ["Total Investment", `${fmt(flip.total_investment_low)} – ${fmt(flip.total_investment_high)}`, "text-orange-400"],
                  ["Expected Resale", fmt(flip.resale_value), "text-green-400"],
                ].map(([label, val, color]) => (
                  <div key={label as string} className="flex items-center justify-between py-2 border-b border-zinc-800/50">
                    <span className="text-sm text-zinc-500">{label}</span>
                    <span className={`text-sm font-mono font-bold ${color}`}>{val}</span>
                  </div>
                ))}
                <div className="flex items-center justify-between pt-2">
                  <span className="text-sm font-bold text-white">Profit Range</span>
                  <span className={`text-lg font-mono font-bold ${flip.profit_low >= 0 ? "text-green-400" : "text-red-400"}`}>
                    {fmt(flip.profit_low)} — {fmt(flip.profit_high)}
                  </span>
                </div>
              </div>
            </div>

            {/* ROI */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 text-center">
                <div className="text-xs text-zinc-500 uppercase mb-1">ROI Range</div>
                <div className={`text-2xl font-bold font-mono ${flip.roi_low >= 0 ? "text-green-400" : "text-red-400"}`}>
                  {flip.roi_low}% — {flip.roi_high}%
                </div>
              </div>
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 text-center">
                <div className="text-xs text-zinc-500 uppercase mb-1">Margin Range</div>
                <div className={`text-2xl font-bold font-mono ${flip.margin_low >= 0 ? "text-green-400" : "text-red-400"}`}>
                  {flip.margin_low}% — {flip.margin_high}%
                </div>
              </div>
            </div>

            <FeedbackWidget estimateId={`flip-${Date.now()}`} />

            <div className="flex gap-3">
              <button onClick={() => setStep(2)} className="px-6 py-3.5 rounded-xl border border-zinc-700 text-zinc-400 text-sm font-semibold hover:bg-zinc-800 transition">Back to Estimate</button>
              <button onClick={resetAll}
                className="flex-1 bg-zinc-800 text-white py-3.5 rounded-xl font-bold text-sm hover:bg-zinc-700 transition flex items-center justify-center gap-2">
                <Plus className="w-4 h-4" /> New Estimate
              </button>
            </div>
            </>
            )}
          </div>
        )}
      </main>

      {/* ═══ UPGRADE MODAL ═══ */}
      {showUpgrade && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-6" onClick={() => setShowUpgrade(false)}>
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl max-w-md w-full p-8" onClick={e => e.stopPropagation()}>
            <div className="text-center mb-6">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center mx-auto mb-4">
                <Crown className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-xl font-bold text-white">Upgrade to PRO</h3>
              <p className="text-sm text-zinc-400 mt-1">Unlock the full car flipping toolkit</p>
            </div>

            <div className="space-y-3 mb-6">
              {[
                ["Auto-scrape Copart/IAA listings", "Paste URL, get everything"],
                ["Live parts marketplace", "eBay Motors + RockAuto prices"],
                ["Direct purchase links", "Buy parts with one click"],
                ["Unlimited estimates", "No monthly cap"],
                ["Saved estimate portfolio", "Track all your deals"],
                ["Export as PDF", "Share with partners"],
              ].map(([title, desc]) => (
                <div key={title} className="flex items-start gap-3">
                  <CheckCircle className="w-4 h-4 text-green-400 mt-0.5 shrink-0" />
                  <div>
                    <div className="text-sm font-semibold text-white">{title}</div>
                    <div className="text-xs text-zinc-500">{desc}</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-zinc-800 rounded-xl p-4 mb-4 text-center">
              <div className="text-3xl font-bold text-white">$29<span className="text-sm font-normal text-zinc-400">/mo</span></div>
              <div className="text-xs text-zinc-500 mt-1">Cancel anytime. 7-day free trial.</div>
            </div>

            <button className="w-full bg-gradient-to-r from-amber-500 to-orange-600 text-white py-3.5 rounded-xl font-bold text-sm hover:from-amber-400 hover:to-orange-500 transition flex items-center justify-center gap-2">
              <Zap className="w-4 h-4" /> Start Free Trial
            </button>
            <button onClick={() => setShowUpgrade(false)} className="w-full text-zinc-500 text-xs mt-3 hover:text-zinc-300 transition">Maybe later</button>
          </div>
        </div>
      )}

      <footer className="border-t border-zinc-800 px-6 py-6 mt-12 text-center">
        <p className="text-xs text-zinc-600">AutoFlip — Honest repair estimates. No black boxes.</p>
        <p className="text-[10px] text-zinc-700 mt-1">VIN data: NHTSA (free) · Labor rates: proprietary lookup table · Parts: eBay Motors + RockAuto</p>
      </footer>
    </div>
    </ErrorBoundary>
  );
}
