'use client';

import React from 'react';
import {
  Settings as SettingsIcon,
  User,
  Sliders,
  Bell,
  Activity,
  Save,
  RefreshCw,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { AuthService } from '@/services/auth.service';

type TabType = 'profile' | 'preferences' | 'logs';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = React.useState<TabType>('profile');
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [message, setMessage] = React.useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Profile Form State
  const [profile, setProfile] = React.useState({
    preferred_name: '',
    exam_attempt: '',
    exam_date: '',
    daily_study_hours: 4.0,
    preferred_language: 'English',
    preferred_study_time: 'Morning',
    strong_subjects: [] as string[],
    weak_subjects: [] as string[]
  });

  // Preferences Form State
  const [preferences, setPreferences] = React.useState({
    theme: 'dark',
    voice_type: 'female',
    voice_enabled: true,
    notification_email: true,
    notification_inapp: true,
    notification_study_reminder: true,
    notification_revision_reminder: true,
    notification_goal_reminder: true,
    notification_mock_reminder: true,
    notification_missed_session: true
  });

  // Activity Logs state
  const [logs, setLogs] = React.useState<any[]>([]);

  React.useEffect(() => {
    async function loadSettingsData() {
      try {
        const profileData = await AuthService.getProfile();
        setProfile({
          preferred_name: profileData.preferred_name || '',
          exam_attempt: profileData.exam_attempt || '',
          exam_date: profileData.exam_date || '',
          daily_study_hours: Number(profileData.daily_study_hours) || 4.0,
          preferred_language: profileData.preferred_language || 'English',
          preferred_study_time: profileData.preferred_study_time || 'Morning',
          strong_subjects: profileData.strong_subjects || [],
          weak_subjects: profileData.weak_subjects || []
        });

        const prefsData = await AuthService.getPreferences();
        setPreferences({
          theme: prefsData.theme || 'dark',
          voice_type: prefsData.voice_type || 'female',
          voice_enabled: prefsData.voice_enabled !== false,
          notification_email: prefsData.notification_email !== false,
          notification_inapp: prefsData.notification_inapp !== false,
          notification_study_reminder: prefsData.notification_study_reminder !== false,
          notification_revision_reminder: prefsData.notification_revision_reminder !== false,
          notification_goal_reminder: prefsData.notification_goal_reminder !== false,
          notification_mock_reminder: prefsData.notification_mock_reminder !== false,
          notification_missed_session: prefsData.notification_missed_session !== false
        });

        const activityLogs = await AuthService.getActivityLogs();
        setLogs(Array.isArray(activityLogs) ? activityLogs : activityLogs.results || []);
      } catch (err) {
        console.error('Failed to load settings:', err);
      } finally {
        setLoading(false);
      }
    }

    loadSettingsData();
  }, []);

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      await AuthService.updateProfile(profile);
      setMessage({ text: 'Academic profile updated successfully.', type: 'success' });
    } catch (err) {
      console.error(err);
      setMessage({ text: 'Failed to update academic profile.', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handlePreferencesSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const updatedPrefs = await AuthService.updatePreferences(preferences);
      
      // Update theme classes in Document Element for instant feedback
      const localTheme = updatedPrefs.theme || preferences.theme;
      localStorage.setItem('theme', localTheme);
      if (localTheme === 'light') {
        document.documentElement.classList.add('light-theme');
      } else {
        document.documentElement.classList.remove('light-theme');
      }

      setMessage({ text: 'App preferences updated successfully.', type: 'success' });
    } catch (err) {
      console.error(err);
      setMessage({ text: 'Failed to update app preferences.', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col justify-center items-center text-zinc-400">
        <RefreshCw className="h-8 w-8 animate-spin text-indigo-500 mb-2" />
        <span>Syncing preference configurations...</span>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <h2 className="text-2xl font-black text-white">Student Settings</h2>
        <p className="text-zinc-500 text-sm">Configure your personal CA Foundation exam date, target hours, AI mentor choices, and alert schedules.</p>
      </div>

      {message && (
        <div className={`p-4 rounded-xl flex items-center gap-3 border ${
          message.type === 'success' 
            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
            : 'bg-red-500/10 border-red-500/30 text-red-400'
        }`}>
          {message.type === 'success' ? <CheckCircle2 className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}
          <span className="text-xs font-semibold">{message.text}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
        
        {/* Navigation Sidebar Tabs */}
        <div className="md:col-span-4 space-y-2">
          <button
            onClick={() => { setActiveTab('profile'); setMessage(null); }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
              activeTab === 'profile'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/10'
                : 'bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700'
            }`}
          >
            <User className="h-4.5 w-4.5" />
            <span>Academic Profile</span>
          </button>

          <button
            onClick={() => { setActiveTab('preferences'); setMessage(null); }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
              activeTab === 'preferences'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/10'
                : 'bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700'
            }`}
          >
            <Sliders className="h-4.5 w-4.5" />
            <span>AI & UI Preferences</span>
          </button>

          <button
            onClick={() => { setActiveTab('logs'); setMessage(null); }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
              activeTab === 'logs'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/10'
                : 'bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700'
            }`}
          >
            <Activity className="h-4.5 w-4.5" />
            <span>Security & Audit Logs</span>
          </button>
        </div>

        {/* Tab Contents Panel */}
        <div className="md:col-span-8 bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
          
          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <form onSubmit={handleProfileSubmit} className="space-y-6">
              <div className="flex items-center gap-2 mb-2 border-b border-zinc-800 pb-4">
                <User className="h-5 w-5 text-indigo-400" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">Personal & Academic Info</h3>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-zinc-400 text-[10px] font-bold uppercase tracking-wider mb-2">Preferred Name</label>
                  <input
                    type="text"
                    required
                    value={profile.preferred_name}
                    onChange={(e) => setProfile({ ...profile, preferred_name: e.target.value })}
                    className="w-full px-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-white text-xs focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-zinc-400 text-[10px] font-bold uppercase tracking-wider mb-2">Daily Study Budget</label>
                  <input
                    type="number"
                    min="1"
                    max="18"
                    value={profile.daily_study_hours}
                    onChange={(e) => setProfile({ ...profile, daily_study_hours: Number(e.target.value) })}
                    className="w-full px-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-white text-xs focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-zinc-400 text-[10px] font-bold uppercase tracking-wider mb-2">Target Exam Attempt</label>
                  <select
                    value={profile.exam_attempt}
                    onChange={(e) => setProfile({ ...profile, exam_attempt: e.target.value })}
                    className="w-full px-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-white text-xs focus:outline-none focus:border-indigo-500"
                  >
                    <option value="">Select attempt...</option>
                    <option value="June 2026">June 2026</option>
                    <option value="December 2026">December 2026</option>
                    <option value="June 2027">June 2027</option>
                    <option value="December 2027">December 2027</option>
                  </select>
                </div>

                <div>
                  <label className="block text-zinc-400 text-[10px] font-bold uppercase tracking-wider mb-2">Exam Date</label>
                  <input
                    type="date"
                    required
                    value={profile.exam_date}
                    onChange={(e) => setProfile({ ...profile, exam_date: e.target.value })}
                    className="w-full px-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-white text-xs focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-zinc-400 text-[10px] font-bold uppercase tracking-wider mb-2">Preferred Study Time</label>
                  <select
                    value={profile.preferred_study_time}
                    onChange={(e) => setProfile({ ...profile, preferred_study_time: e.target.value })}
                    className="w-full px-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-white text-xs focus:outline-none focus:border-indigo-500"
                  >
                    <option value="Morning">Early Morning (4 AM - 9 AM)</option>
                    <option value="Afternoon">Day Study (10 AM - 3 PM)</option>
                    <option value="Evening">Evening Focus (4 PM - 8 PM)</option>
                    <option value="Night">Late Night (9 PM - 2 AM)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-zinc-400 text-[10px] font-bold uppercase tracking-wider mb-2">Mentor Instruction Language</label>
                  <select
                    value={profile.preferred_language}
                    onChange={(e) => setProfile({ ...profile, preferred_language: e.target.value })}
                    className="w-full px-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-white text-xs focus:outline-none focus:border-indigo-500"
                  >
                    <option value="English">Pure English (Academic)</option>
                    <option value="Hindi">Hindi</option>
                    <option value="Hinglish">Hinglish (Colloquial mix)</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                disabled={saving}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-bold rounded-xl text-xs transition-all cursor-pointer disabled:opacity-50"
              >
                {saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                <span>Save Academic Changes</span>
              </button>
            </form>
          )}

          {/* Preferences Tab */}
          {activeTab === 'preferences' && (
            <form onSubmit={handlePreferencesSubmit} className="space-y-6">
              <div className="flex items-center gap-2 mb-2 border-b border-zinc-800 pb-4">
                <Sliders className="h-5 w-5 text-indigo-400" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">Interface & Sound Settings</h3>
              </div>

              {/* Theme & Voice UI */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-zinc-400 text-[10px] font-bold uppercase tracking-wider mb-2">Display Theme Mode</label>
                  <select
                    value={preferences.theme}
                    onChange={(e) => setPreferences({ ...preferences, theme: e.target.value })}
                    className="w-full px-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-white text-xs focus:outline-none focus:border-indigo-500"
                  >
                    <option value="dark">Dark Theme (Glassmorphic)</option>
                    <option value="light">Light Theme (Minimalist)</option>
                    <option value="system">Follow System Defaults</option>
                  </select>
                </div>

                <div>
                  <label className="block text-zinc-400 text-[10px] font-bold uppercase tracking-wider mb-2">Speech Synthesis Voice</label>
                  <select
                    value={preferences.voice_type}
                    onChange={(e) => setPreferences({ ...preferences, voice_type: e.target.value })}
                    className="w-full px-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-white text-xs focus:outline-none focus:border-indigo-500"
                  >
                    <option value="female">Soprano (Female Accent)</option>
                    <option value="male">Baritone (Male Accent)</option>
                    <option value="neutral">Neutral robotic (Standard)</option>
                  </select>
                </div>
              </div>

              {/* Speech Voice enabled toggle */}
              <div className="flex items-center justify-between p-4 bg-zinc-950 border border-zinc-800 rounded-xl">
                <div>
                  <h4 className="text-xs font-bold text-white">Audio Readback</h4>
                  <p className="text-zinc-500 text-[10px]">Read AI Mentor text messages aloud using web speech synthesis.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setPreferences({ ...preferences, voice_enabled: !preferences.voice_enabled })}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    preferences.voice_enabled
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/10'
                      : 'bg-zinc-800 text-zinc-400 hover:text-white'
                  }`}
                >
                  {preferences.voice_enabled ? 'Enabled' : 'Disabled'}
                </button>
              </div>

              {/* Notifications subheader */}
              <div className="pt-2 border-t border-zinc-850">
                <div className="flex items-center gap-2 mb-4">
                  <Bell className="h-4 w-4 text-indigo-400" />
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">Alert Triggers</h4>
                </div>

                <div className="space-y-3">
                  {/* Master channel toggles */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center justify-between p-3 bg-zinc-950 border border-zinc-800 rounded-xl">
                      <span className="text-xs font-medium text-zinc-300">In-App Banner Notifications</span>
                      <input
                        type="checkbox"
                        checked={preferences.notification_inapp}
                        onChange={(e) => setPreferences({ ...preferences, notification_inapp: e.target.checked })}
                        className="accent-indigo-500 h-4 w-4 rounded border-zinc-800 bg-zinc-950"
                      />
                    </div>

                    <div className="flex items-center justify-between p-3 bg-zinc-950 border border-zinc-800 rounded-xl">
                      <span className="text-xs font-medium text-zinc-300">Email Updates</span>
                      <input
                        type="checkbox"
                        checked={preferences.notification_email}
                        onChange={(e) => setPreferences({ ...preferences, notification_email: e.target.checked })}
                        className="accent-indigo-500 h-4 w-4 rounded border-zinc-800 bg-zinc-950"
                      />
                    </div>
                  </div>

                  {/* Specific triggers list */}
                  <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-xs font-bold text-white block">Study Reminders</span>
                        <span className="text-[10px] text-zinc-500">Alerts when pending tasks exist on your dashboard daily.</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={preferences.notification_study_reminder}
                        onChange={(e) => setPreferences({ ...preferences, notification_study_reminder: e.target.checked })}
                        className="accent-indigo-500 h-4 w-4 rounded border-zinc-800 bg-zinc-950"
                      />
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-zinc-900">
                      <div>
                        <span className="text-xs font-bold text-white block">Spaced Revisions due</span>
                        <span className="text-[10px] text-zinc-500">Reminds you to complete recall flashcard schedules to prevent memory loss.</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={preferences.notification_revision_reminder}
                        onChange={(e) => setPreferences({ ...preferences, notification_revision_reminder: e.target.checked })}
                        className="accent-indigo-500 h-4 w-4 rounded border-zinc-800 bg-zinc-950"
                      />
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-zinc-900">
                      <div>
                        <span className="text-xs font-bold text-white block">Study Goals warnings</span>
                        <span className="text-[10px] text-zinc-500">Notifies you if target hours coefficients drop or streaks break.</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={preferences.notification_goal_reminder}
                        onChange={(e) => setPreferences({ ...preferences, notification_goal_reminder: e.target.checked })}
                        className="accent-indigo-500 h-4 w-4 rounded border-zinc-800 bg-zinc-950"
                      />
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-zinc-900">
                      <div>
                        <span className="text-xs font-bold text-white block">Mock Exam alerts</span>
                        <span className="text-[10px] text-zinc-500">Triggers alert notifications for newly assigned curriculum practice tests.</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={preferences.notification_mock_reminder}
                        onChange={(e) => setPreferences({ ...preferences, notification_mock_reminder: e.target.checked })}
                        className="accent-indigo-500 h-4 w-4 rounded border-zinc-800 bg-zinc-950"
                      />
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-zinc-900">
                      <div>
                        <span className="text-xs font-bold text-white block">Missed Session reports</span>
                        <span className="text-[10px] text-zinc-500">Sends alerts when checkins are missing for consecutive study periods.</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={preferences.notification_missed_session}
                        onChange={(e) => setPreferences({ ...preferences, notification_missed_session: e.target.checked })}
                        className="accent-indigo-500 h-4 w-4 rounded border-zinc-800 bg-zinc-950"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={saving}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-bold rounded-xl text-xs transition-all cursor-pointer disabled:opacity-50"
              >
                {saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                <span>Save Preferences</span>
              </button>
            </form>
          )}

          {/* Activity Logs Tab */}
          {activeTab === 'logs' && (
            <div className="space-y-6">
              <div className="flex items-center gap-2 mb-2 border-b border-zinc-800 pb-4">
                <Activity className="h-5 w-5 text-indigo-400" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">Security & Audit logs</h3>
              </div>

              {logs.length === 0 ? (
                <p className="text-center py-10 text-zinc-500 text-xs">No activity records logged yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-zinc-800 text-zinc-500 font-bold uppercase text-[9px] tracking-wider">
                        <th className="pb-3">Timestamp</th>
                        <th className="pb-3">Action</th>
                        <th className="pb-3">Details</th>
                        <th className="pb-3">Device</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-850">
                      {logs.map((log) => (
                        <tr key={log.id} className="text-zinc-350 hover:text-white transition-colors">
                          <td className="py-3 text-[10px] text-zinc-500">
                            {new Date(log.timestamp).toLocaleString()}
                          </td>
                          <td className="py-3 font-semibold text-indigo-400 uppercase text-[10px] tracking-wider">
                            {log.action}
                          </td>
                          <td className="py-3 max-w-[200px] truncate" title={log.details ? (typeof log.details === 'object' ? JSON.stringify(log.details) : String(log.details)) : ''}>
                            {log.details ? (typeof log.details === 'object' ? JSON.stringify(log.details) : String(log.details)) : 'N/A'}
                          </td>
                          <td className="py-3 text-zinc-500 capitalize">{log.device}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

        </div>

      </div>
    </div>
  );
}
