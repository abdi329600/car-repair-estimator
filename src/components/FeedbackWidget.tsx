"use client";

import { useState } from "react";

export function FeedbackWidget({ estimateId }: { estimateId: string }) {
  const [submitted, setSubmitted] = useState(false);

  async function handleFeedback(accuracy: "accurate" | "close" | "off") {
    try {
      await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          estimate_id: estimateId,
          accuracy,
          timestamp: new Date().toISOString(),
        }),
      });
      setSubmitted(true);
    } catch (error) {
      console.error("Feedback error:", error);
    }
  }

  if (submitted) {
    return (
      <div className="bg-zinc-900 border border-green-800/40 rounded-2xl p-5 text-center">
        <span className="text-sm text-green-400 font-medium">Thanks for your feedback! 🙏</span>
      </div>
    );
  }

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
      <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">Was this estimate accurate?</p>
      <div className="flex gap-2">
        <button onClick={() => handleFeedback("accurate")}
          className="flex-1 px-4 py-2.5 bg-green-900/30 border border-green-800 text-green-400 rounded-xl text-xs font-bold hover:bg-green-900/50 transition">
          👍 Spot on
        </button>
        <button onClick={() => handleFeedback("close")}
          className="flex-1 px-4 py-2.5 bg-blue-900/30 border border-blue-800 text-blue-400 rounded-xl text-xs font-bold hover:bg-blue-900/50 transition">
          📊 Close enough
        </button>
        <button onClick={() => handleFeedback("off")}
          className="flex-1 px-4 py-2.5 bg-red-900/30 border border-red-800 text-red-400 rounded-xl text-xs font-bold hover:bg-red-900/50 transition">
          ❌ Way off
        </button>
      </div>
    </div>
  );
}
