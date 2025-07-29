import React, { useState } from 'react';
import { Eye, EyeOff, AlertCircle } from 'lucide-react';

interface AdminLoginProps {
  onAuthenticated: () => void;
}

const AdminLogin: React.FC<AdminLoginProps> = ({ onAuthenticated }) => {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const ADMIN_PASSWORD = 'Kankermissfish69';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    // Simulate authentication delay for security
    await new Promise(resolve => setTimeout(resolve, 500));

    if (password === ADMIN_PASSWORD) {
      // Store authentication in session storage
      sessionStorage.setItem('adminAuthenticated', 'true');
      sessionStorage.setItem('adminLoginTime', Date.now().toString());
      onAuthenticated();
    } else {
      setError('Invalid password. Access denied.');
      setPassword('');
    }
    
    setIsLoading(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSubmit(e as any);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center">
      <div className="w-full max-w-md mx-auto px-6">
        {/* Logo and Title */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2" style={{ color: '#ffffff' }}>
            Admin Access
          </h1>
          <p className="text-base" style={{ color: '#888888' }}>
            Enter the admin password to access LeadGenOS
          </p>
        </div>

        {/* Login Form */}
        <div 
          className="rounded-xl p-8 shadow-2xl"
          style={{ 
            backgroundColor: '#1a1a1a', 
            border: '1px solid #333333',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
          }}
        >
          {/* Error Message */}
          {error && (
            <div 
              className="mb-6 p-4 rounded-lg flex items-center space-x-3"
              style={{
                backgroundColor: '#1a0f0f',
                border: '1px solid #ef4444',
                color: '#ef4444'
              }}
            >
              <AlertCircle className="w-5 h-5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {/* Password Input */}
            <div className="mb-6">
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Enter admin password"
                  className="w-full px-4 py-3 pr-12 rounded-xl focus:outline-none focus:ring-2 focus:ring-opacity-50 transition-all duration-300"
                  style={{
                    backgroundColor: '#0f0f0f',
                    border: '1px solid #333333',
                    color: '#ffffff',
                    fontSize: '16px'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#555555';
                    e.target.style.backgroundColor = '#1a1a1a';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#333333';
                    e.target.style.backgroundColor = '#0f0f0f';
                  }}
                  required
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                  disabled={isLoading}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Login Button */}
            <button
              type="submit"
              disabled={!password.trim() || isLoading}
              className="w-full px-6 py-3 rounded-xl font-semibold transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-3 shadow-lg hover:shadow-xl"
              style={{
                backgroundColor: '#333333',
                color: '#ffffff',
                border: '1px solid #555555'
              }}
              onMouseEnter={(e) => {
                if (!e.currentTarget.disabled) {
                  e.currentTarget.style.backgroundColor = '#444444';
                  e.currentTarget.style.borderColor = '#666666';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }
              }}
              onMouseLeave={(e) => {
                if (!e.currentTarget.disabled) {
                  e.currentTarget.style.backgroundColor = '#333333';
                  e.currentTarget.style.borderColor = '#555555';
                  e.currentTarget.style.transform = 'translateY(0px)';
                }
              }}
            >
              {isLoading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Authenticating...</span>
                </>
              ) : (
                <>
                  <span>Access Dashboard</span>
                </>
              )}
            </button>
          </form>

          {/* Security Notice */}
          <div className="mt-6 text-center">
            <p className="text-xs" style={{ color: '#666666' }}>
              🔒 Secure admin access • Session expires automatically
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-8">
          <p className="text-sm" style={{ color: '#666666' }}>
            Lead Generation OS • Powered by Node AI
          </p>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;