import React from 'react';

export function getStatusBadgeStyle(status) {
  switch (String(status).toUpperCase()) {
    case 'PRESENT':
    case 'ACTIVE':
    case 'GOOD':
    case 'ELIGIBLE':
      return 'bg-[#1d2b11] text-[#A3E635] border-[#3b5124]';
    case 'ABSENT':
    case 'CANCELLED':
    case 'CRITICAL':
    case 'SHORTAGE':
      return 'bg-[#35171d] text-[#fb7185] border-[#71313d]';
    case 'LATE':
    case 'WARNING':
    case 'SCHEDULED':
      return 'bg-[#302510] text-[#fbbf24] border-[#67501e]';
    case 'EXCUSED':
    case 'COMPLETED':
      return 'bg-[#202620] text-white border-[#3b453b]';
    default:
      return 'bg-[#202620] text-white border-[#3b453b]';
  }
}

export function Badge({ children, status, variant, className = '' }) {
  const badgeStyle = status ? getStatusBadgeStyle(status) : variant || 'bg-[#202620] text-white border-[#3b453b]';
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${badgeStyle} ${className}`}
    >
      {children}
    </span>
  );
}
