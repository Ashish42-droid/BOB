import React from 'react';
import { ShieldCheck, AlertTriangle, AlertOctagon, Info } from 'lucide-react';

export default function RiskBadge({ level = 'LOW', size = 'normal' }) {
  const normalizedLevel = (level || 'LOW').toUpperCase();

  let styleClasses = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 glow-emerald';
  let icon = <ShieldCheck className="w-4 h-4 text-emerald-400" />;
  let label = 'GREEN — LOW / PROTOCOL-ELIGIBLE';

  if (normalizedLevel === 'MODERATE' || normalizedLevel === 'YELLOW') {
    styleClasses = 'bg-amber-500/10 text-amber-400 border-amber-500/30 glow-amber';
    icon = <AlertTriangle className="w-4 h-4 text-amber-400" />;
    label = 'YELLOW — REQUIRES DOCTOR REVIEW';
  } else if (normalizedLevel === 'HIGH') {
    styleClasses = 'bg-orange-500/15 text-orange-400 border-orange-500/40 glow-amber';
    icon = <AlertTriangle className="w-4 h-4 text-orange-400" />;
    label = 'ORANGE — HIGH RISK / ESCALATION';
  } else if (normalizedLevel === 'EMERGENCY' || normalizedLevel === 'RED') {
    styleClasses = 'bg-rose-600/20 text-rose-300 border-rose-500/50 glow-rose animate-pulse';
    icon = <AlertOctagon className="w-4 h-4 text-rose-400" />;
    label = 'RED — EMERGENCY / IMMEDIATE DOCTOR & REFERRAL';
  }

  const padding = size === 'small' ? 'px-2.5 py-0.5 text-xs' : 'px-3.5 py-1.5 text-xs font-bold';

  return (
    <span className={`inline-flex items-center gap-2 rounded-full border shadow-md ${styleClasses} ${padding}`}>
      {icon}
      <span>{label}</span>
    </span>
  );
}
