import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  CheckSquare,
  QrCode,
  BarChart3,
  BookOpen,
  UserCheck,
  User,
  Settings,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export function Sidebar({ isCollapsed, toggleSidebar, isMobileOpen, closeMobile }) {
  const { role, user } = useAuth();
  const isTeacherOrAdmin = role === 'TEACHER' || role === 'ADMIN';

  const teacherNavGroups = [
    {
      group: 'OVERVIEW',
      items: [{ label: 'Dashboard Overview', path: '/dashboard', icon: LayoutDashboard }],
    },
    {
      group: 'ATTENDANCE WORKSPACE',
      items: [
        { label: 'Student Roster', path: '/students', icon: Users },
        { label: 'Mark Attendance', path: '/attendance', icon: CheckSquare },
        { label: 'Dynamic QR Session', path: '/qr-attendance', icon: QrCode },
      ],
    },
    {
      group: 'ANALYTICS & REPORTS',
      items: [{ label: 'Analytics & Reports', path: '/reports', icon: BarChart3 }],
    },
    {
      group: 'ACCOUNT',
      items: [{ label: 'Profile & Settings', path: '/profile', icon: User }],
    },
  ];

  const studentNavGroups = [
    {
      group: 'STUDENT PORTAL',
      items: [
        { label: 'My Dashboard', path: '/dashboard', icon: LayoutDashboard },
        { label: 'Attendance Records', path: '/my-attendance', icon: UserCheck },
        { label: 'Scan QR Code', path: '/scan-qr', icon: QrCode },
      ],
    },
    {
      group: 'ACCOUNT',
      items: [{ label: 'Profile & Settings', path: '/profile', icon: Settings }],
    },
  ];

  const navGroups = isTeacherOrAdmin
    ? [
        ...teacherNavGroups,
        ...(role === 'ADMIN'
          ? [{ group: 'ADMINISTRATION', items: [{ label: 'Institution Setup', path: '/admin', icon: BookOpen }] }]
          : []),
      ]
    : studentNavGroups;

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-xs lg:hidden"
          onClick={closeMobile}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`app-sidebar fixed top-0 left-0 z-40 h-screen bg-[#191714] text-white border-r border-[#403a31] transition-all duration-300 ease-in-out flex flex-col ${
          isCollapsed ? 'w-20' : 'w-64'
        } ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Secure Attendance Brand Header */}
        <div className="flex items-center justify-between h-20 px-5 border-b border-[#403a31] bg-[#29251f]">
          <div className="flex items-center space-x-3 overflow-hidden">
            <div className="w-10 h-10 rounded-xl bg-[#fbf8f1] p-0.5 shadow-md shrink-0">
              <img
                src="/brand/secure-attendance-emblem.png"
                alt="Secure Attendance emblem"
                className="h-full w-full rounded-lg object-contain"
              />
            </div>
            {!isCollapsed && (
              <div className="flex flex-col overflow-hidden">
                <span className="text-xs font-black text-white tracking-wide">SECURE ATTENDANCE</span>
                <span className="text-[10px] font-semibold text-slate-300 tracking-wider uppercase truncate mt-0.5">
                  Scan · Verify · Attend
                </span>
              </div>
            )}
          </div>

          {/* Desktop Sidebar Collapse Toggle */}
          <button
            onClick={toggleSidebar}
            className="hidden lg:flex items-center justify-center w-7 h-7 rounded-lg bg-[#191714] text-slate-400 hover:text-white hover:bg-[#403a31] transition-colors border border-[#403a31]"
            aria-label="Toggle sidebar width"
          >
            {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* User Account Role Card */}
        {!isCollapsed && user && (
          <div className="mx-4 my-4 p-3 rounded-xl bg-[#29251f] border border-[#403a31] flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-[#b94d24] text-white font-bold flex items-center justify-center text-xs shrink-0">
              {user.first_name ? user.first_name[0] : 'U'}
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-bold text-white truncate">
                {user.first_name} {user.last_name}
              </p>
              <p className="text-[10px] text-slate-400 uppercase font-semibold tracking-wider flex items-center mt-0.5">
                <ShieldCheck className="w-3 h-3 text-[#d9794f] mr-1 inline" />
                <span className="text-[#d9794f] font-bold">{user.role}</span>
              </p>
            </div>
          </div>
        )}

        {/* Navigation Group Items */}
        <nav className="flex-1 px-3 py-2 space-y-5 overflow-y-auto">
          {navGroups.map((group, idx) => (
            <div key={idx} className="space-y-1">
              {!isCollapsed && (
                <p className="px-3 text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-1.5">
                  {group.group}
                </p>
              )}
              {group.items.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    onClick={closeMobile}
                    className={({ isActive }) =>
                      `flex items-center px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-150 group ${
                        isActive
                          ? 'bg-[#b94d24] text-white shadow-md font-bold'
                          : 'text-slate-300 hover:bg-[#29251f] hover:text-white'
                      } ${isCollapsed ? 'justify-center' : 'space-x-3'}`
                    }
                    title={isCollapsed ? item.label : undefined}
                  >
                    <Icon className="w-4 h-4 shrink-0 transition-transform group-hover:scale-105" />
                    {!isCollapsed && <span className="truncate">{item.label}</span>}
                  </NavLink>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Footer info */}
        {!isCollapsed && (
          <div className="p-4 border-t border-[#403a31] bg-[#29251f] text-center">
            <p className="text-[11px] text-slate-300 font-mono">
              Secure Attendance
            </p>
          </div>
        )}
      </aside>
    </>
  );
}
