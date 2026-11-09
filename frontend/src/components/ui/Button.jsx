import React from 'react';
import { Loader2 } from 'lucide-react';

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  disabled = false,
  icon: Icon,
  className = '',
  ...props
}) {
  const baseStyles = 'inline-flex items-center justify-center font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#f4efe5] disabled:opacity-50 disabled:cursor-not-allowed rounded-xl cursor-pointer shadow-xs';

  const variants = {
    primary: 'bg-[#b94d24] hover:bg-[#9f3d1c] text-white focus:ring-[#b94d24]/40 active:bg-[#9f3d1c]',
    navy: 'bg-[#191714] hover:bg-[#29251f] text-white focus:ring-[#b94d24]/30 border border-[#403a31]',
    secondary: 'bg-[#f4e1d7] text-[#9f3d1c] hover:bg-[#ebd0c1] border border-[#e5c4b1] focus:ring-[#b94d24]/30',
    teal: 'bg-[#f4e1d7] hover:bg-[#ebd0c1] text-[#9f3d1c] border border-[#e5c4b1] focus:ring-[#b94d24]/30',
    outline: 'border border-slate-200 bg-[#fbf8f1] text-[#191714] hover:bg-slate-50 focus:ring-[#b94d24]/30',
    ghost: 'text-slate-600 hover:bg-slate-100 hover:text-[#191714] focus:ring-[#b94d24]/30 shadow-none',
    danger: 'bg-rose-700 hover:bg-rose-600 text-white focus:ring-rose-500/40',
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-xs gap-1.5',
    md: 'px-4 py-2.5 text-sm gap-2',
    lg: 'px-5 py-3 text-base gap-2.5',
  };

  return (
    <button
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <Loader2 className="w-4 h-4 animate-spin shrink-0" />
      ) : Icon ? (
        <Icon className="w-4 h-4 shrink-0" />
      ) : null}
      {children}
    </button>
  );
}
