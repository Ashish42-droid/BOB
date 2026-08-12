import React from 'react';
import { ShieldCheck, AlertTriangle, AlertOctagon } from 'lucide-react';

/**
 * Triage badge — every case is HIGH, MEDIUM, or LOW.
 * (Legacy values MODERATE/YELLOW map to MEDIUM; EMERGENCY/RED map to HIGH.)
 */
export default function RiskBadge({ level = 'LOW', size = 'normal' }) {
  const raw = (level || 'LOW').toUpperCase();
  const normalized =
    raw === 'MODERATE' || raw === 'YELLOW' || raw === 'MEDIUM' ? 'MEDIUM'
    : raw === 'EMERGENCY' || raw === 'RED' || raw === 'HIGH' ? 'HIGH'
    : 'LOW';

  const styles = {
    LOW: {
      classes: 'bg-emerald-50 text-emerald-800 border-emerald-300',
      icon: <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />,
      label: 'LOW RISK'
    },
    MEDIUM: {
      classes: 'bg-amber-50 text-amber-800 border-amber-300',
      icon: <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />,
      label: 'MEDIUM RISK'
    },
    HIGH: {
      classes: 'bg-red-50 text-red-800 border-red-300 font-bold',
      icon: <AlertOctagon className="w-3.5 h-3.5 text-red-600" />,
      label: 'HIGH RISK'
    }
  }[normalized];

  const padding = size === 'small' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-xs font-semibold';

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border ${styles.classes} ${padding}`}>
      {styles.icon}
      <span>{styles.label}</span>
    </span>
  );
}
