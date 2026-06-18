'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  Bell, 
  Flame, 
  Award, 
  ShieldCheck, 
  Clock, 
  RotateCcw, 
  Target, 
  AlertTriangle, 
  Trophy, 
  Sparkles, 
  Calendar, 
  CheckCircle2, 
  ChevronRight,
  Info,
  Menu
} from 'lucide-react';
import { AnalyticsService } from '@/services/analytics.service';
import { NotificationService } from '@/services/notification.service';
import { AuthService } from '@/services/auth.service';

interface HeaderProps {
  onMenuToggle?: () => void;
}

export default function Header({ onMenuToggle }: HeaderProps) {
  const router = useRouter();
  const [stats, setStats] = React.useState<any>(null);
  const [unreadCount, setUnreadCount] = React.useState(0);
  const [profile, setProfile] = React.useState<any>(null);
  const [notifications, setNotifications] = React.useState<any[]>([]);
  const [dropdownOpen, setDropdownOpen] = React.useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  const fetchNotifications = React.useCallback(async () => {
    try {
      const data = await NotificationService.getNotifications();
      setNotifications(Array.isArray(data) ? data : data.results || []);
    } catch (e) {
      console.error(e);
    }
  }, []);

  const loadHeaderData = React.useCallback(async () => {
    try {
      const statsData = await AnalyticsService.getDashboardStats();
      setStats(statsData);
      
      const countData = await NotificationService.getUnreadCount();
      setUnreadCount(countData.unread_count);

      const profileData = await AuthService.getProfile();
      setProfile(profileData);
    } catch (e) {
      console.error(e);
    }
  }, []);

  React.useEffect(() => {
    loadHeaderData();
    fetchNotifications();

    // Refresh unread count and notifications every minute
    const interval = setInterval(async () => {
      try {
        const countData = await NotificationService.getUnreadCount();
        setUnreadCount(countData.unread_count);
        if (dropdownOpen) {
          fetchNotifications();
        }
      } catch (e) {}
    }, 60000);

    return () => clearInterval(interval);
  }, [loadHeaderData, fetchNotifications, dropdownOpen]);

  // Click outside to close dropdown
  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleToggleDropdown = () => {
    const nextState = !dropdownOpen;
    setDropdownOpen(nextState);
    if (nextState) {
      fetchNotifications();
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await NotificationService.markAllRead();
      setUnreadCount(0);
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    } catch (e) {
      console.error(e);
    }
  };

  const handleNotificationClick = async (notification: any) => {
    try {
      if (!notification.is_read) {
        await NotificationService.markRead(notification.id);
        setUnreadCount(prev => Math.max(0, prev - 1));
        setNotifications(prev => prev.map(n => n.id === notification.id ? { ...n, is_read: true } : n));
      }
      setDropdownOpen(false);
      if (notification.action_url) {
        router.push(notification.action_url);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'study_reminder':
        return <Clock className="h-4 w-4 text-indigo-400" />;
      case 'revision_reminder':
        return <RotateCcw className="h-4 w-4 text-teal-400" />;
      case 'goal_reminder':
        return <Target className="h-4 w-4 text-purple-400" />;
      case 'mock_reminder':
        return <Award className="h-4 w-4 text-amber-400" />;
      case 'missed_session':
        return <AlertTriangle className="h-4 w-4 text-red-400" />;
      case 'streak_update':
        return <Flame className="h-4 w-4 text-amber-500 fill-amber-500/20" />;
      case 'achievement':
        return <Trophy className="h-4 w-4 text-yellow-400" />;
      case 'ai_insight':
        return <Sparkles className="h-4 w-4 text-indigo-400" />;
      case 'schedule_update':
        return <Calendar className="h-4 w-4 text-blue-400" />;
      default:
        return <Bell className="h-4 w-4 text-zinc-400" />;
    }
  };

  const formatRelativeTime = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays < 7) return `${diffDays}d ago`;
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    } catch (e) {
      return '';
    }
  };

  return (
    <header className="h-20 border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-md flex items-center justify-between px-4 md:px-8 sticky top-0 z-10 w-full md:w-[calc(100%-16rem)] ml-0 md:ml-64 light-theme:bg-white/80 light-theme:border-zinc-200">
      {/* Welcome Banner */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuToggle}
          className="md:hidden p-2 bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white rounded-xl cursor-pointer"
          title="Open Menu"
        >
          <Menu className="h-4.5 w-4.5" />
        </button>
        <div>
          <h1 className="text-zinc-400 text-xs font-semibold uppercase tracking-wider light-theme:text-zinc-500">
            Personal AI Mentorship
          </h1>
          <p className="text-white font-bold text-sm md:text-lg light-theme:text-zinc-900 line-clamp-1">
            Welcome back, {profile?.preferred_name || 'Student'}!
          </p>
        </div>
      </div>

      {/* Quick Stats Panel */}
      <div className="flex items-center gap-6">
        {/* Streak */}
        <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-500 font-semibold text-sm">
          <Flame className="h-5 w-5 fill-amber-500/20" />
          <span>{stats?.streak || 0} Day Streak</span>
        </div>

        {/* Readiness */}
        <div className="flex items-center gap-2 px-3 py-1.5 bg-indigo-500/10 border border-indigo-500/30 rounded-xl text-indigo-400 font-semibold text-sm">
          <ShieldCheck className="h-5 w-5" />
          <span>{stats?.readiness_score || 50}% Ready</span>
        </div>

        {/* Bell Alerts Dropdown Wrapper */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={handleToggleDropdown}
            className="relative cursor-pointer p-2 hover:bg-zinc-900 rounded-xl light-theme:hover:bg-zinc-50 transition-colors flex items-center justify-center border-none bg-transparent outline-none focus:outline-none"
            title="Notifications"
          >
            <Bell className="h-5 w-5 text-zinc-400 hover:text-white light-theme:hover:text-zinc-900" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-600 border-2 border-zinc-950 text-[10px] text-white font-bold flex items-center justify-center">
                {unreadCount}
              </span>
            )}
          </button>

          {dropdownOpen && (
            <div className="absolute right-0 mt-2 w-80 bg-zinc-950 border border-zinc-800 rounded-2xl shadow-xl overflow-hidden z-50 py-2 light-theme:bg-white light-theme:border-zinc-200">
              <div className="px-4 py-2 border-b border-zinc-900 flex justify-between items-center bg-zinc-900/40 light-theme:bg-zinc-50 light-theme:border-zinc-200">
                <span className="text-xs font-bold text-white uppercase tracking-wider light-theme:text-zinc-800">Notifications</span>
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllRead}
                    className="text-[10px] text-indigo-400 hover:text-indigo-300 font-bold transition-colors cursor-pointer"
                  >
                    Mark all read
                  </button>
                )}
              </div>

              <div className="max-h-[320px] overflow-y-auto divide-y divide-zinc-900 light-theme:divide-zinc-100">
                {notifications.length === 0 ? (
                  <div className="py-12 text-center text-zinc-500 space-y-2 px-4 light-theme:text-zinc-400">
                    <Info className="h-6 w-6 text-zinc-700 mx-auto light-theme:text-zinc-350" />
                    <p className="text-white font-bold text-xs light-theme:text-zinc-700">No notifications yet</p>
                    <p className="text-[10px] light-theme:text-zinc-500">Your personal mentor reminders and test notifications will appear here.</p>
                  </div>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n.id}
                      onClick={() => handleNotificationClick(n)}
                      className={`p-4 flex gap-3 cursor-pointer hover:bg-zinc-900 transition-colors light-theme:hover:bg-zinc-50 ${
                        !n.is_read ? 'bg-indigo-600/5' : ''
                      }`}
                    >
                      <div className="h-8 w-8 rounded-xl bg-zinc-900 border border-zinc-850 flex items-center justify-center flex-shrink-0 mt-0.5 light-theme:bg-zinc-100 light-theme:border-zinc-200">
                        {getNotificationIcon(n.notification_type)}
                      </div>

                      <div className="flex-1 space-y-1">
                        <div className="flex justify-between items-start gap-2">
                          <h4 className={`text-xs text-white leading-tight light-theme:text-zinc-800 ${!n.is_read ? 'font-bold' : 'font-medium'}`}>
                            {n.title}
                          </h4>
                          {!n.is_read && (
                            <span className="h-2 w-2 rounded-full bg-indigo-500 flex-shrink-0 mt-1" />
                          )}
                        </div>
                        <p className="text-[11px] text-zinc-400 leading-normal line-clamp-2 light-theme:text-zinc-650">
                          {n.message}
                        </p>
                        <span className="text-[9px] text-zinc-500 block pt-0.5 light-theme:text-zinc-400">
                          {formatRelativeTime(n.created_at)}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
