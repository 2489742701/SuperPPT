import React, { useState, useRef, useEffect } from 'react';
import { LucideIcon } from 'lucide-react';

interface ToolbarDropdownProps {
  icon: LucideIcon;
  label: string;
  children: React.ReactNode;
}

export function ToolbarDropdown({ icon: Icon, label, children }: ToolbarDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 hover:bg-zinc-100 rounded flex items-center gap-1 text-sm text-zinc-700"
      >
        <Icon size={18} />
        <span>{label}</span>
      </button>
      {isOpen && (
        <div className="absolute top-full left-0 mt-1 bg-white border border-zinc-200 shadow-lg rounded py-1 w-48 z-50">
          {children}
        </div>
      )}
    </div>
  );
}
