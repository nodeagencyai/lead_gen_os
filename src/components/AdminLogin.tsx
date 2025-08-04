import React, { useState } from 'react';
import { Lock, Eye, EyeOff, ArrowRight } from 'lucide-react';

interface AdminLoginProps {
  onAuthenticated: () => void;
}

const AdminLogin: React.FC<AdminLoginProps> = ({ onAuthenticated }) => {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Use environment variable for admin password
  const ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!password) {
      setError('Please enter a password.');
      return;
    }
    
    setLoading(true);
    setError(null);

    // Simulate a brief loading delay for better UX
    setTimeout(() => {
      try {
        if (password === ADMIN_PASSWORD) {
          // Store auth state in sessionStorage
          sessionStorage.setItem('adminAuthenticated', 'true');
          sessionStorage.setItem('adminLoginTime', Date.now().toString());
          onAuthenticated();
        } else {
          setError('Incorrect password. Please try again.');
          setPassword('');
        }
      } catch (_error) {
        setError('Authentication failed. Please try again.');
      }
      setLoading(false);
    }, 800);
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center px-4">
      {/* Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div 
          className="absolute -top-40 -right-40 w-80 h-80 rounded-full opacity-10"
          style={{ 
            background: 'radial-gradient(circle, #ffffff 0%, transparent 70%)',
            filter: 'blur(40px)'
          }}
        />
        <div 
          className="absolute -bottom-40 -left-40 w-80 h-80 rounded-full opacity-10"
          style={{ 
            background: 'radial-gradient(circle, #ffffff 0%, transparent 70%)',
            filter: 'blur(40px)'
          }}
        />
      </div>
      
      <div className="max-w-md w-full">
        {/* Logo */}
        <div className="text-center mb-12">
          <img 
            src="/Node Logo-White.png" 
            alt="Node AI Logo" 
            className="h-16 w-auto mx-auto mb-8 opacity-90"
          />
          <h1 className="text-4xl font-bold text-white mb-4 tracking-tight">
            LeadGenOS
          </h1>
          <div 
            className="w-16 h-0.5 mx-auto mb-4 rounded-full"
            style={{ 
              background: 'linear-gradient(90deg, transparent 0%, #333333 20%, #666666 50%, #333333 80%, transparent 100%)',
              boxShadow: '0 0 8px rgba(102, 102, 102, 0.3)',
              opacity: '0.6'
            }}
          />
          <p className="text-lg font-light" style={{ color: '#aaaaaa' }}>
            Enter admin password to access the dashboard
          </p>
        </div>

        {/* Auth Form */}
        <div 
          className="rounded-xl p-6 shadow-2xl"
          style={{ 
            backgroundColor: '#1a1a1a', 
            border: '1px solid #333333',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
          }}
        >
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Password Input */}
            <div className="relative">
                <Lock 
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4"
                  style={{ color: '#888888' }}
                />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (error) setError(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !loading) {
                      e.preventDefault();
                      handleSubmit(e);
                    }
                  }}
                  required
                  className="w-full pl-10 pr-10 py-3 rounded-xl focus:outline-none transition-all duration-300"
                  style={{
                    backgroundColor: '#0f0f0f',
                    border: '1px solid #333333',
                    color: '#ffffff',
                    fontSize: '16px'
                  }}
                  placeholder="Enter admin password"
                  onFocus={(e) => {
                    e.target.style.borderColor = '#555555';
                    e.target.style.backgroundColor = '#1a1a1a';
                    e.target.style.boxShadow = '0 0 0 3px rgba(85, 85, 85, 0.2)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#333333';
                    e.target.style.backgroundColor = '#0f0f0f';
                    e.target.style.boxShadow = 'none';
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4 text-gray-400 hover:text-white transition-colors" />
                  ) : (
                    <Eye className="w-4 h-4 text-gray-400 hover:text-white transition-colors" />
                  )}
                </button>
            </div>

            {/* Error Message */}
            {error && (
              <div 
                className="p-4 rounded-xl text-sm font-medium"
                style={{ 
                  backgroundColor: '#1a1a1a', 
                  border: '1px solid #ef4444', 
                  color: '#ef4444' 
                }}
              >
                {error}
              </div>
            )}

            {/* Submit Button */}
            <button
              type="button"
              disabled={loading || !password}
              onClick={handleSubmit}
              className="w-full py-3 px-10 rounded-xl font-semibold transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-3 shadow-lg hover:shadow-xl"
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
              {loading ? (
                <>
                  <div 
                    className="animate-spin rounded-full border-2 border-t-transparent w-5 h-5"
                    style={{
                      borderColor: '#ffffff',
                      borderTopColor: 'transparent'
                    }}
                  />
                  <span>Authenticating...</span>
                </>
              ) : (
                <>
                  <span>Access Dashboard</span>
                  <ArrowRight size={20} />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Footer */}
        <div className="text-center text-sm mt-12" style={{ color: '#555555' }}>
          <div className="flex items-center justify-center space-x-2 mb-2">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#10b981' }} />
            <span>Secure Connection</span>
          </div>
          <div>Powered by Node AI</div>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;