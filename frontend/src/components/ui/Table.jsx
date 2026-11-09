import React from 'react';

export function Table({ children, className = '' }) {
  return (
    <div className="w-full overflow-x-auto rounded-xl border border-slate-200 bg-[#111411] shadow-xs">
      <table className={`w-full text-left border-collapse text-sm ${className}`}>
        {children}
      </table>
    </div>
  );
}

export function TableHeader({ children }) {
  return (
    <thead className="bg-[#181d18] border-b border-slate-200 text-xs uppercase text-slate-300 font-semibold tracking-wider">
      {children}
    </thead>
  );
}

export function TableBody({ children }) {
  return <tbody className="divide-y divide-slate-100 text-white">{children}</tbody>;
}

export function TableRow({ children, onClick, className = '' }) {
  return (
    <tr
      onClick={onClick}
      className={`transition-colors hover:bg-slate-50/80 ${onClick ? 'cursor-pointer' : ''} ${className}`}
    >
      {children}
    </tr>
  );
}

export function TableHead({ children, className = '' }) {
  return <th className={`px-4 py-3.5 font-semibold text-white ${className}`}>{children}</th>;
}

export function TableCell({ children, className = '' }) {
  return <td className={`px-4 py-3.5 align-middle ${className}`}>{children}</td>;
}
