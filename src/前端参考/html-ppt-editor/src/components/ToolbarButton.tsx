import React from 'react';
import { LucideIcon } from 'lucide-react';

interface ToolbarButtonProps {
  onClick: () => void;
  icon: LucideIcon;
  label?: string;
  title?: string;
  disabled?: boolean;
  active?: boolean;
}

export function ToolbarButton({ onClick, icon: Icon, label, title, disabled, active }: ToolbarButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`p-2 rounded flex items-center gap-1 text-sm transition-colors ${
        active ? 'bg-zinc-200 text-zinc-900' : 'text-zinc-700 hover:bg-zinc-100'
      } ${disabled ? 'text-zinc-300 cursor-not-allowed' : ''}`}
      title={title}
    >
      <Icon size={18} />
      {label && <span>{label}</span>}
    </button>
  );
}
