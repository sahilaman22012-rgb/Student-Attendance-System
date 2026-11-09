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
  const baseStyles = 'inline-flex items-center justify-center font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#080a08] disabled:opacity-50 disabled:cursor-not-allowed rounded-xl cursor-pointer shadow-xs';

  const variants = {
    primary: 'bg-[#A3E635] hover:bg-[#BEF264] text-[#080a08] focus:ring-[#A3E635]/40 active:bg-[#84CC16]',
    navy: 'bg-[#202620] hover:bg-[#303830] text-white focus:ring-[#A3E635]/30 border border-[#303830]',
    secondary: 'bg-[#1d2b11] text-[#A3E635] hover:bg-[#283a18] border border-[#3b5124] focus:ring-[#A3E635]/30',
    teal: 'bg-[#1d2b11] hover:bg-[#283a18] text-[#A3E635] border border-[#3b5124] focus:ring-[#A3E635]/30',
    outline: 'border border-slate-200 bg-[#111411] text-white hover:bg-slate-50 focus:ring-[#A3E635]/30',
    ghost: 'text-slate-300 hover:bg-slate-100 hover:text-white focus:ring-[#A3E635]/30 shadow-none',
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
