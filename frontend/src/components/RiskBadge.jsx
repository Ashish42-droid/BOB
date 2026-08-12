import React from 'react';
import { ShieldCheck, AlertTriangle, AlertOctagon } from 'lucide-react';

export default function RiskBadge({ level = 'LOW', size = 'normal' }) {
  const normalizedLevel = (level || 'LOW').toUpperCase();

  let styleClasses = 'bg-emerald-50 text-emerald-800 border-emerald-300';
  let icon = <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />;
  let label = 'LOW RISK';

  if (normalizedLevel === 'MODERATE' || normalizedLevel === 'YELLOW') {
    styleClasses = 'bg-amber-50 text-amber-800 border-amber-300';
    icon = <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />;
    label = 'MODERATE RISK';
  } else if (normalizedLevel === 'HIGH') {
    styleClasses = 'bg-orange-50 text-orange-800 border-orange-300';
    icon = <AlertTriangle className="w-3.5 h-3.5 text-orange-600" />;
    label = 'HIGH RISK';
  } else if (normalizedLevel === 'EMERGENCY' || normalizedLevel === 'RED') {
    styleClasses = 'bg-red-50 text-red-800 border-red-300 font-bold';
    icon = <AlertOctagon className="w-3.5 h-3.5 text-red-600" />;
    label = 'EMERGENCY';
  }

  const padding = size === 'small' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-xs font-semibold';

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border ${styleClasses} ${padding}`}>
      {icon}
      <span>{label}</span>
    </span>
  );
}
