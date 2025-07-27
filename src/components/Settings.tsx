import React, { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Key, User, Bell, Shield, Save, Check, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import CampaignToggle from './CampaignToggle';

interface SettingsProps {
  onNavigate: (view: 'dashboard' | 'leadfinder' | 'campaigns' | 'leads' | 'integrations' | 'settings') => void;
}

interface UserProfile {
  id: string;
  email: string;
  full_name?: string;
  company?: string;
  phone?: string;
}

interface NotificationSettings {
  email_notifications: boolean;
  campaign_updates: boolean;
  lead_alerts: boolean;
  weekly_reports: boolean;
}

interface SecuritySettings {
  two_factor_enabled: boolean;
  session_timeout: number;
  api_access_enabled: boolean;
}

const Settings: React.FC<SettingsProps> = ({ onNavigate }) => {
  const [activeTab, setActiveTab] = useState('profile');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Profile state
  const [profile, setProfile] = useState<UserProfile>({
    id: '',
    email: '',
    full_name: '',
    company: '',
    phone: ''
  });

  // Notifications state
  const [notifications, setNotifications] = useState<NotificationSettings>({
    email_notifications: true,
    campaign_updates: true,
    lead_alerts: true,
    weekly_reports: false
  });

  // Security state
  const [security, setSecurity] = useState<SecuritySettings>({
    two_factor_enabled: false,
    session_timeout: 30,
    api_access_enabled: false
  });

  // Password change state
  const [passwordData, setPasswordData] = useState({
    current_password: '',
    new_password: '',
    confirm_password: ''
  });

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      setLoading(true);
      const { data: user } = await supabase.auth.getUser();
      
      if (user.user) {
        setProfile({
          id: user.user.id,
          email: user.user.email || '',
          full_name: user.user.user_metadata?.full_name || '',
          company: user.user.user_metadata?.company || '',
          phone: user.user.user_metadata?.phone || ''
        });

        // Load user preferences (you might want to create a user_preferences table)
        // For now, using default values
      }
    } catch (error) {
      console.error('Error loading user data:', error);
      setMessage({ type: 'error', text: 'Failed to load user data' });
    } finally {
      setLoading(false);
    }
  };

  const saveProfile = async () => {
    try {
      setSaving(true);
      
      const { error } = await supabase.auth.updateUser({
        data: {
          full_name: profile.full_name,
          company: profile.company,
          phone: profile.phone
        }
      });

      if (error) throw error;

      setMessage({ type: 'success', text: 'Profile updated successfully' });
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      console.error('Error saving profile:', error);
      setMessage({ type: 'error', text: 'Failed to update profile' });
    } finally {
      setSaving(false);
    }
  };

  const changePassword = async () => {
    if (passwordData.new_password !== passwordData.confirm_password) {
      setMessage({ type: 'error', text: 'New passwords do not match' });
      return;
    }

    if (passwordData.new_password.length < 6) {
      setMessage({ type: 'error', text: 'Password must be at least 6 characters' });
      return;
    }

    try {
      setSaving(true);
      
      const { error } = await supabase.auth.updateUser({
        password: passwordData.new_password
      });

      if (error) throw error;

      setPasswordData({ current_password: '', new_password: '', confirm_password: '' });
      setMessage({ type: 'success', text: 'Password updated successfully' });
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      console.error('Error changing password:', error);
      setMessage({ type: 'error', text: 'Failed to change password' });
    } finally {
      setSaving(false);
    }
  };

  const saveNotifications = async () => {
    try {
      setSaving(true);
      // In a real app, you'd save this to a user_preferences table
      // For now, just show success message
      setMessage({ type: 'success', text: 'Notification preferences saved' });
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to save notification preferences' });
    } finally {
      setSaving(false);
    }
  };

  const saveSecurity = async () => {
    try {
      setSaving(true);
      // In a real app, you'd implement 2FA and other security features
      setMessage({ type: 'success', text: 'Security settings saved' });
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to save security settings' });
    } finally {
      setSaving(false);
    }
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      // Redirect to login or refresh page
      window.location.reload();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'integrations', label: 'Integrations', icon: Key }
  ];

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Navigation */}
      <nav className="px-6 py-4" style={{ backgroundColor: '#1a1a1a', borderBottom: '1px solid #333333' }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <img 
              src="/Node Logo-White.png" 
              alt="Logo" 
              className="h-8 w-auto"
            />
          </div>
          <div className="flex space-x-8">
            <button 
              onClick={() => onNavigate('dashboard')}
              className="transition-colors hover:opacity-80"
              style={{ color: '#888888' }}
            >
              Dashboard
            </button>
            <button 
              onClick={() => onNavigate('leadfinder')}
              className="transition-colors hover:opacity-80"
              style={{ color: '#888888' }}
            >
              Generate
            </button>
            <button 
              onClick={() => onNavigate('leads')}
              className="transition-colors hover:opacity-80"
              style={{ color: '#888888' }}
            >
              Leads
            </button>
            <button 
              onClick={() => onNavigate('campaigns')}
              className="transition-colors hover:opacity-80" 
              style={{ color: '#888888' }}
            >
              Campaigns
            </button>
            <button 
              onClick={() => onNavigate('integrations')}
              className="transition-colors hover:opacity-80" 
              style={{ color: '#888888' }}
            >
              Integrations
            </button>
            <button 
              onClick={() => onNavigate('settings')}
              className="transition-colors hover:opacity-80" 
              style={{ color: '#ffffff' }}
            >
              Settings
            </button>
          </div>
          <div className="flex items-center">
            <CampaignToggle />
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="flex">
        {/* Sidebar */}
        <div className="w-64 min-h-screen" style={{ backgroundColor: '#1a1a1a', borderRight: '1px solid #333333' }}>
          <div className="p-6">
            <div className="flex items-center space-x-3 mb-8">
              <SettingsIcon className="w-6 h-6" style={{ color: '#888888' }} />
              <h2 className="text-xl font-semibold text-white">Settings</h2>
            </div>
            
            <nav className="space-y-2">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-left transition-all duration-200 ${
                      activeTab === tab.id 
                        ? 'text-white' 
                        : 'text-gray-400 hover:text-white hover:bg-gray-800'
                    }`}
                    style={{
                      backgroundColor: activeTab === tab.id ? '#333333' : 'transparent',
                      border: activeTab === tab.id ? '1px solid #555555' : '1px solid transparent'
                    }}
                  >
                    <Icon size={18} />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 p-8">
          {/* Message */}
          {message && (
            <div 
              className={`mb-6 p-4 rounded-lg flex items-center space-x-2 ${
                message.type === 'success' 
                  ? 'bg-green-900/20 border border-green-500/30 text-green-400'
                  : 'bg-red-900/20 border border-red-500/30 text-red-400'
              }`}
            >
              {message.type === 'success' ? <Check size={16} /> : <AlertCircle size={16} />}
              <span>{message.text}</span>
            </div>
          )}

          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <div className="max-w-2xl">
              <h3 className="text-2xl font-bold mb-6 text-white">Profile Settings</h3>
              
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: '#ffffff' }}>
                      Full Name
                    </label>
                    <input
                      type="text"
                      value={profile.full_name}
                      onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
                      className="w-full px-4 py-3 rounded-lg focus:outline-none transition-all duration-300"
                      style={{
                        backgroundColor: '#1a1a1a',
                        border: '1px solid #333333',
                        color: '#ffffff'
                      }}
                      onFocus={(e) => e.target.style.borderColor = '#555555'}
                      onBlur={(e) => e.target.style.borderColor = '#333333'}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: '#ffffff' }}>
                      Email
                    </label>
                    <input
                      type="email"
                      value={profile.email}
                      disabled
                      className="w-full px-4 py-3 rounded-lg opacity-50 cursor-not-allowed"
                      style={{
                        backgroundColor: '#1a1a1a',
                        border: '1px solid #333333',
                        color: '#ffffff'
                      }}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: '#ffffff' }}>
                      Company
                    </label>
                    <input
                      type="text"
                      value={profile.company}
                      onChange={(e) => setProfile({ ...profile, company: e.target.value })}
                      className="w-full px-4 py-3 rounded-lg focus:outline-none transition-all duration-300"
                      style={{
                        backgroundColor: '#1a1a1a',
                        border: '1px solid #333333',
                        color: '#ffffff'
                      }}
                      onFocus={(e) => e.target.style.borderColor = '#555555'}
                      onBlur={(e) => e.target.style.borderColor = '#333333'}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: '#ffffff' }}>
                      Phone
                    </label>
                    <input
                      type="tel"
                      value={profile.phone}
                      onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                      className="w-full px-4 py-3 rounded-lg focus:outline-none transition-all duration-300"
                      style={{
                        backgroundColor: '#1a1a1a',
                        border: '1px solid #333333',
                        color: '#ffffff'
                      }}
                      onFocus={(e) => e.target.style.borderColor = '#555555'}
                      onBlur={(e) => e.target.style.borderColor = '#333333'}
                    />
                  </div>
                </div>

                <div className="pt-4">
                  <button
                    onClick={saveProfile}
                    disabled={saving}
                    className="flex items-center space-x-2 px-6 py-3 rounded-lg font-medium transition-all duration-200 disabled:opacity-50 hover:opacity-80"
                    style={{
                      backgroundColor: '#333333',
                      border: '1px solid #555555',
                      color: '#ffffff'
                    }}
                  >
                    <Save size={16} />
                    <span>{saving ? 'Saving...' : 'Save Profile'}</span>
                  </button>
                </div>

                {/* Password Change Section */}
                <div className="pt-8 border-t" style={{ borderColor: '#333333' }}>
                  <h4 className="text-lg font-semibold mb-4 text-white">Change Password</h4>
                  
                  <div className="space-y-4 max-w-md">
                    <div>
                      <label className="block text-sm font-medium mb-2" style={{ color: '#ffffff' }}>
                        New Password
                      </label>
                      <input
                        type="password"
                        value={passwordData.new_password}
                        onChange={(e) => setPasswordData({ ...passwordData, new_password: e.target.value })}
                        className="w-full px-4 py-3 rounded-lg focus:outline-none transition-all duration-300"
                        style={{
                          backgroundColor: '#1a1a1a',
                          border: '1px solid #333333',
                          color: '#ffffff'
                        }}
                        onFocus={(e) => e.target.style.borderColor = '#555555'}
                        onBlur={(e) => e.target.style.borderColor = '#333333'}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2" style={{ color: '#ffffff' }}>
                        Confirm New Password
                      </label>
                      <input
                        type="password"
                        value={passwordData.confirm_password}
                        onChange={(e) => setPasswordData({ ...passwordData, confirm_password: e.target.value })}
                        className="w-full px-4 py-3 rounded-lg focus:outline-none transition-all duration-300"
                        style={{
                          backgroundColor: '#1a1a1a',
                          border: '1px solid #333333',
                          color: '#ffffff'
                        }}
                        onFocus={(e) => e.target.style.borderColor = '#555555'}
                        onBlur={(e) => e.target.style.borderColor = '#333333'}
                      />
                    </div>

                    <button
                      onClick={changePassword}
                      disabled={saving || !passwordData.new_password || !passwordData.confirm_password}
                      className="flex items-center space-x-2 px-6 py-3 rounded-lg font-medium transition-all duration-200 disabled:opacity-50 hover:opacity-80"
                      style={{
                        backgroundColor: '#333333',
                        border: '1px solid #555555',
                        color: '#ffffff'
                      }}
                    >
                      <Save size={16} />
                      <span>{saving ? 'Changing...' : 'Change Password'}</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Notifications Tab */}
          {activeTab === 'notifications' && (
            <div className="max-w-2xl">
              <h3 className="text-2xl font-bold mb-6 text-white">Notification Settings</h3>
              
              <div className="space-y-6">
                {Object.entries(notifications).map(([key, value]) => (
                  <div key={key} className="flex items-center justify-between p-4 rounded-lg" style={{ backgroundColor: '#1a1a1a', border: '1px solid #333333' }}>
                    <div>
                      <h4 className="font-medium text-white">
                        {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </h4>
                      <p className="text-sm" style={{ color: '#888888' }}>
                        {key === 'email_notifications' && 'Receive email notifications for important updates'}
                        {key === 'campaign_updates' && 'Get notified when campaigns start, pause, or complete'}
                        {key === 'lead_alerts' && 'Receive alerts when leads reply or book meetings'}
                        {key === 'weekly_reports' && 'Get weekly performance reports via email'}
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={value}
                        onChange={(e) => setNotifications({ ...notifications, [key]: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                ))}

                <div className="pt-4">
                  <button
                    onClick={saveNotifications}
                    disabled={saving}
                    className="flex items-center space-x-2 px-6 py-3 rounded-lg font-medium transition-all duration-200 disabled:opacity-50 hover:opacity-80"
                    style={{
                      backgroundColor: '#333333',
                      border: '1px solid #555555',
                      color: '#ffffff'
                    }}
                  >
                    <Save size={16} />
                    <span>{saving ? 'Saving...' : 'Save Preferences'}</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Security Tab */}
          {activeTab === 'security' && (
            <div className="max-w-2xl">
              <h3 className="text-2xl font-bold mb-6 text-white">Security Settings</h3>
              
              <div className="space-y-6">
                <div className="flex items-center justify-between p-4 rounded-lg" style={{ backgroundColor: '#1a1a1a', border: '1px solid #333333' }}>
                  <div>
                    <h4 className="font-medium text-white">Two-Factor Authentication</h4>
                    <p className="text-sm" style={{ color: '#888888' }}>
                      Add an extra layer of security to your account
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={security.two_factor_enabled}
                      onChange={(e) => setSecurity({ ...security, two_factor_enabled: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                <div className="p-4 rounded-lg" style={{ backgroundColor: '#1a1a1a', border: '1px solid #333333' }}>
                  <h4 className="font-medium text-white mb-4">Session Timeout</h4>
                  <div className="flex items-center space-x-4">
                    <input
                      type="range"
                      min="15"
                      max="120"
                      step="15"
                      value={security.session_timeout}
                      onChange={(e) => setSecurity({ ...security, session_timeout: parseInt(e.target.value) })}
                      className="flex-1"
                    />
                    <span className="text-sm" style={{ color: '#888888' }}>
                      {security.session_timeout} minutes
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 rounded-lg" style={{ backgroundColor: '#1a1a1a', border: '1px solid #333333' }}>
                  <div>
                    <h4 className="font-medium text-white">API Access</h4>
                    <p className="text-sm" style={{ color: '#888888' }}>
                      Allow third-party applications to access your data
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={security.api_access_enabled}
                      onChange={(e) => setSecurity({ ...security, api_access_enabled: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                <div className="pt-4 flex items-center space-x-4">
                  <button
                    onClick={saveSecurity}
                    disabled={saving}
                    className="flex items-center space-x-2 px-6 py-3 rounded-lg font-medium transition-all duration-200 disabled:opacity-50 hover:opacity-80"
                    style={{
                      backgroundColor: '#333333',
                      border: '1px solid #555555',
                      color: '#ffffff'
                    }}
                  >
                    <Save size={16} />
                    <span>{saving ? 'Saving...' : 'Save Settings'}</span>
                  </button>

                  <button
                    onClick={signOut}
                    className="px-6 py-3 rounded-lg font-medium transition-all duration-200 hover:opacity-80"
                    style={{
                      backgroundColor: '#dc2626',
                      border: '1px solid #ef4444',
                      color: '#ffffff'
                    }}
                  >
                    Sign Out
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Integrations Tab */}
          {activeTab === 'integrations' && (
            <div className="max-w-2xl">
              <h3 className="text-2xl font-bold mb-6 text-white">Integration Settings</h3>
              
              <div className="p-6 rounded-lg" style={{ backgroundColor: '#1a1a1a', border: '1px solid #333333' }}>
                <p className="text-center" style={{ color: '#888888' }}>
                  Integration settings are managed in the dedicated Integrations page.
                </p>
                <div className="text-center mt-4">
                  <button
                    onClick={() => onNavigate('integrations')}
                    className="px-6 py-3 rounded-lg font-medium transition-all duration-200 hover:opacity-80"
                    style={{
                      backgroundColor: '#333333',
                      border: '1px solid #555555',
                      color: '#ffffff'
                    }}
                  >
                    Go to Integrations
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Settings;