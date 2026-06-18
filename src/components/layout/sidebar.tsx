'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  LayoutDashboard,
  GraduationCap,
  MessageSquare,
  Calendar,
  Sparkles,
  ClipboardCheck,
  LineChart,
  BookOpen,
  CalendarDays,
  Settings,
  LogOut,
  Moon,
  Sun
} from 'lucide-react';
import { AuthService } from '@/services/auth.service';

const NAV_ITEMS = [
  { label: 'Command Center', icon: LayoutDashboard, href: '/dashboard' },
  { label: 'Learn (AI Teacher)', icon: GraduationCap, href: '/dashboard/learn' },
  { label: 'AI Chat', icon: MessageSquare, href: '/dashboard/chat' },
  { label: 'Revision', icon: Sparkles, href: '/dashboard/revision' },
  { label: 'Schedule', icon: Calendar, href: '/dashboard/schedule' },
  { label: 'MCQ Practice', icon: ClipboardCheck, href: '/dashboard/mcq' },
  { label: 'Mock Tests', icon: CalendarDays, href: '/dashboard/mock-test' },
  { label: 'Analytics', icon: LineChart, href: '/dashboard/analytics' },
  { label: 'Library', icon: BookOpen, href: '/dashboard/library' },
  { label: 'Daily Check-in', icon: ClipboardCheck, href: '/dashboard/checkin' },
  { label: 'Settings', icon: Settings, href: '/dashboard/settings' },
];

interface SidebarProps {
  onClose?: () => void;
  isMobile?: boolean;
}

export default function Sidebar({ onClose, isMobile }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [theme, setTheme] = React.useState<'dark' | 'light'>('dark');

  React.useEffect(() => {
    // Read local theme
    const localTheme = localStorage.getItem('theme') || 'dark';
    setTheme(localTheme as 'dark' | 'light');
    if (localTheme === 'light') {
      document.documentElement.classList.add('light-theme');
    } else {
      document.documentElement.classList.remove('light-theme');
    }
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    localStorage.setItem('theme', nextTheme);
    if (nextTheme === 'light') {
      document.documentElement.classList.add('light-theme');
    } else {
      document.documentElement.classList.remove('light-theme');
    }
  };

  const handleLogout = async () => {
    try {
      await AuthService.logout();
    } catch (e) {
      console.error(e);
    } finally {
      if (onClose) onClose();
      router.push('/login');
    }
  };

  const containerClass = isMobile
    ? "w-64 border-r border-zinc-800 bg-zinc-950 flex flex-col h-screen fixed left-0 top-0 z-50 light-theme:bg-white light-theme:border-zinc-200"
    : "w-64 border-r border-zinc-800 bg-zinc-950 flex flex-col h-screen fixed left-0 top-0 z-20 md:flex hidden light-theme:bg-white light-theme:border-zinc-200";

  return (
    <aside className={containerClass}>
      {/* Brand Header */}
      <div className="p-6 border-b border-zinc-800 light-theme:border-zinc-200">
        <Link href="/dashboard" onClick={onClose} className="flex items-center gap-3">
          <div className="p-2 bg-indigo-600 rounded-lg text-white">
            <GraduationCap className="h-6 w-6" />
          </div>
          <span className="font-bold text-lg text-white light-theme:text-zinc-900 tracking-wide">
            STUDY COMMANDER
          </span>
        </Link>
      </div>

      {/* Nav List */}
      <nav className="flex-1 overflow-y-auto p-4 space-y-1">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all relative ${
                isActive
                  ? 'text-white font-medium bg-zinc-900 light-theme:bg-zinc-100 light-theme:text-indigo-600'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-900/50 light-theme:text-zinc-600 light-theme:hover:bg-zinc-50 light-theme:hover:text-zinc-900'
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId="active-indicator"
                  className="absolute left-0 w-1 h-6 bg-indigo-500 rounded-r-md"
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                />
              )}
              <Icon className={`h-5 w-5 ${isActive ? 'text-indigo-400 light-theme:text-indigo-600' : ''}`} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Sidebar Footer */}
      <div className="p-4 border-t border-zinc-800 light-theme:border-zinc-200 space-y-2">
        {/* Theme Toggler */}
        <button
          onClick={toggleTheme}
          className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl border border-zinc-800 hover:bg-zinc-900 light-theme:border-zinc-200 light-theme:hover:bg-zinc-50 text-sm text-zinc-400 hover:text-white light-theme:text-zinc-600 light-theme:hover:text-zinc-900 transition-colors"
        >
          <span className="flex items-center gap-2">
            {theme === 'dark' ? (
              <>
                <Moon className="h-4 w-4 text-indigo-400" />
                <span>Dark Mode</span>
              </>
            ) : (
              <>
                <Sun className="h-4 w-4 text-amber-500" />
                <span>Light Mode</span>
              </>
            )}
          </span>
          <span className="text-xs px-2 py-0.5 rounded-md bg-zinc-800 light-theme:bg-zinc-200">
            Active
          </span>
        </button>

        {/* Logout Button */}
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-zinc-400 hover:text-red-400 hover:bg-red-500/10 transition-all text-sm"
        >
          <LogOut className="h-5 w-5" />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
}
