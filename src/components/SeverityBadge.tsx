const COLORS: Record<string, string> = {
  minor: "bg-green-900/50 text-green-400",
  moderate: "bg-yellow-900/50 text-yellow-400",
  severe: "bg-red-900/50 text-red-400",
};

export function SeverityBadge({ severity, className = "" }: { severity: string; className?: string }) {
  return (
    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${COLORS[severity] || COLORS.minor} ${className}`}>
      {severity}
    </span>
  );
}
