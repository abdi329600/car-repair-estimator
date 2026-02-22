import { TrendingUp } from "lucide-react";

interface FlipCalculatorProps {
  purchasePrice: number;
  resaleValue: number;
  onPurchasePriceChange: (v: number) => void;
  onResaleValueChange: (v: number) => void;
  onCalculate: () => void;
  loading: boolean;
}

export function FlipCalculator({
  purchasePrice,
  resaleValue,
  onPurchasePriceChange,
  onResaleValueChange,
  onCalculate,
  loading,
}: FlipCalculatorProps) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp className="w-4 h-4 text-orange-400" />
        <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Flip Calculator</span>
      </div>
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-[10px] text-zinc-500 uppercase mb-1">Purchase Price</label>
          <input type="number" value={purchasePrice || ""} onChange={e => onPurchasePriceChange(Number(e.target.value))}
            placeholder="What you'd pay"
            className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2.5 text-sm font-mono text-white placeholder:text-zinc-600 focus:border-orange-500 focus:outline-none" />
        </div>
        <div>
          <label className="block text-[10px] text-zinc-500 uppercase mb-1">Expected Resale Value</label>
          <input type="number" value={resaleValue || ""} onChange={e => onResaleValueChange(Number(e.target.value))}
            placeholder="What you'd sell for"
            className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2.5 text-sm font-mono text-white placeholder:text-zinc-600 focus:border-orange-500 focus:outline-none" />
        </div>
      </div>
      <button onClick={onCalculate} disabled={!purchasePrice || !resaleValue || loading}
        className="w-full bg-orange-600 text-white py-3 rounded-xl font-bold text-sm hover:bg-orange-700 transition disabled:opacity-40 flex items-center justify-center gap-2">
        <TrendingUp className="w-4 h-4" /> {loading ? "Calculating..." : "Calculate Flip Margin"}
      </button>
    </div>
  );
}
