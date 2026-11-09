import React from 'react';
import { FolderOpen } from 'lucide-react';
import { Button } from './Button';

export function EmptyState({
  icon: Icon = FolderOpen,
  title = 'No records found',
  description = 'There are no items to display at this time.',
  actionLabel,
  onAction,
  className = '',
}) {
  return (
    <div className={`flex flex-col items-center justify-center p-8 text-center bg-[#111411] rounded-xl border border-dashed border-slate-200 ${className}`}>
      <div className="p-3 bg-[#1d2b11] rounded-full text-[#A3E635] mb-3">
        <Icon className="w-8 h-8" />
      </div>
      <h4 className="text-base font-semibold text-white">{title}</h4>
      <p className="text-xs text-slate-500 max-w-sm mt-1 mb-4">{description}</p>
      {actionLabel && onAction && (
        <Button size="sm" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
