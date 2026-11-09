import React from 'react';

export function getStatusBadgeStyle(status) {
  switch (String(status).toUpperCase()) {
    case 'PRESENT':
    case 'ACTIVE':
    case 'GOOD':
    case 'ELIGIBLE':
      return 'bg-[#f4e1d7] text-[#9f3d1c] border-[#e5c4b1]';
    case 'ABSENT':
    case 'CANCELLED':
    case 'CRITICAL':
    case 'SHORTAGE':
      return 'bg-[#f8e6e5] text-[#b42332] border-[#e9bfbd]';
    case 'LATE':
    case 'WARNING':
    case 'SCHEDULED':
      return 'bg-[#f7edda] text-[#9a5a08] border-[#ead7ac]';
    case 'EXCUSED':
    case 'COMPLETED':
      return 'bg-[#ebe3d6] text-[#29251f] border-[#ded5c7]';
    default:
      return 'bg-[#ebe3d6] text-[#29251f] border-[#ded5c7]';
  }
}

export function Badge({ children, status, variant, className = '' }) {
  const badgeStyle = status ? getStatusBadgeStyle(status) : variant || 'bg-[#ebe3d6] text-[#29251f] border-[#ded5c7]';
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${badgeStyle} ${className}`}
    >
      {children}
    </span>
  );
}
