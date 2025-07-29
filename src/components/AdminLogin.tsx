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
    <div className="min-h-screen bg-black text-white flex items-center justify-center relative overflow-hidden">
      {/* Premium Background Effects */}
      <div className="absolute inset-0 opacity-30">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-gradient-to-r from-blue-600/20 to-purple-600/20 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-gradient-to-r from-purple-600/20 to-pink-600/20 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-gradient-to-r from-cyan-600/10 to-blue-600/10 rounded-full blur-2xl"></div>
      </div>
      
      {/* Subtle Grid Pattern */}
      <div 
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, rgba(255,255,255,0.8) 1px, transparent 0)`,
          backgroundSize: '24px 24px'
        }}
      ></div>

      <div className="w-full max-w-lg mx-auto px-8 relative z-10">
        {/* Premium Logo and Title */}
        <div className="text-center mb-12">
          {/* Elegant Logo/Icon */}
          <div className="flex justify-center mb-8">
            <div className="relative">
              <div 
                className="w-20 h-20 rounded-2xl flex items-center justify-center backdrop-blur-xl border-2 shadow-2xl"
                style={{ 
                  background: 'linear-gradient(135deg, rgba(255,255,255,0.1), rgba(255,255,255,0.05))',
                  borderColor: 'rgba(255,255,255,0.2)',
                  boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.8), inset 0 1px 0 rgba(255, 255, 255, 0.1)'
                }}
              >
                <div className="text-2xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                  LG
                </div>
              </div>
              {/* Glow effect */}
              <div 
                className="absolute inset-0 w-20 h-20 rounded-2xl blur-xl opacity-50"
                style={{ background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)' }}
              ></div>
            </div>
          </div>
          
          <h1 className="text-4xl font-light mb-3 tracking-wide" style={{ 
            color: '#ffffff',
            textShadow: '0 2px 4px rgba(0,0,0,0.5)'
          }}>
            Admin Access
          </h1>
          <div className="w-16 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent mx-auto mb-4"></div>
          <p className="text-lg font-light tracking-wide" style={{ color: '#a1a1aa' }}>
            Enter the admin password to access
          </p>
          <p className="text-xl font-medium bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
            LeadGenOS
          </p>
        </div>

        {/* Premium Login Form */}
        <div 
          className="rounded-3xl p-10 backdrop-blur-xl border shadow-2xl relative"
          style={{ 
            background: 'linear-gradient(135deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02))',
            borderColor: 'rgba(255,255,255,0.1)',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.8), inset 0 1px 0 rgba(255, 255, 255, 0.1)'
          }}
        >
          {/* Inner glow effect */}
          <div 
            className="absolute inset-0 rounded-3xl opacity-20"
            style={{
              background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(139, 92, 246, 0.1))',
              filter: 'blur(1px)'
            }}
          ></div>
          
          <div className="relative z-10">
            {/* Premium Error Message */}
            {error && (
              <div 
                className="mb-8 p-5 rounded-2xl flex items-center space-x-3 backdrop-blur-sm border"
                style={{
                  background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.1), rgba(239, 68, 68, 0.05))',
                  borderColor: 'rgba(239, 68, 68, 0.3)',
                  color: '#fecaca',
                  boxShadow: '0 8px 32px rgba(239, 68, 68, 0.1)'
                }}
              >
                <AlertCircle className="w-5 h-5 text-red-400" />
                <span className="font-medium">{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit}>
              {/* Premium Password Input */}
              <div className="mb-8">
                <div className="relative group">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Enter admin password"
                    className="w-full px-6 py-4 pr-14 rounded-2xl backdrop-blur-sm border transition-all duration-300 focus:outline-none text-lg font-medium placeholder:text-gray-500"
                    style={{
                      background: 'linear-gradient(135deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02))',
                      borderColor: 'rgba(255,255,255,0.1)',
                      color: '#ffffff',
                      boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.1), 0 4px 16px rgba(0, 0, 0, 0.3)'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = 'rgba(59, 130, 246, 0.5)';
                      e.target.style.background = 'linear-gradient(135deg, rgba(255,255,255,0.08), rgba(255,255,255,0.04))';
                      e.target.style.boxShadow = 'inset 0 1px 0 rgba(255, 255, 255, 0.1), 0 0 0 1px rgba(59, 130, 246, 0.2), 0 8px 32px rgba(59, 130, 246, 0.1)';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = 'rgba(255,255,255,0.1)';
                      e.target.style.background = 'linear-gradient(135deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02))';
                      e.target.style.boxShadow = 'inset 0 1px 0 rgba(255, 255, 255, 0.1), 0 4px 16px rgba(0, 0, 0, 0.3)';
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

              {/* Premium Login Button */}
              <button
                type="submit"
                disabled={!password.trim() || isLoading}
                className="w-full px-8 py-5 rounded-2xl font-semibold transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-3 relative group overflow-hidden"
                style={{
                  background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.8), rgba(139, 92, 246, 0.8))',
                  border: '1px solid rgba(59, 130, 246, 0.5)',
                  color: '#ffffff',
                  boxShadow: '0 8px 32px rgba(59, 130, 246, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
                  fontSize: '1.1rem',
                  letterSpacing: '0.025em'
                }}
                onMouseEnter={(e) => {
                  if (!e.currentTarget.disabled) {
                    e.currentTarget.style.background = 'linear-gradient(135deg, rgba(59, 130, 246, 0.9), rgba(139, 92, 246, 0.9))';
                    e.currentTarget.style.borderColor = 'rgba(59, 130, 246, 0.7)';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 12px 40px rgba(59, 130, 246, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.2)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!e.currentTarget.disabled) {
                    e.currentTarget.style.background = 'linear-gradient(135deg, rgba(59, 130, 246, 0.8), rgba(139, 92, 246, 0.8))';
                    e.currentTarget.style.borderColor = 'rgba(59, 130, 246, 0.5)';
                    e.currentTarget.style.transform = 'translateY(0px)';
                    e.currentTarget.style.boxShadow = '0 8px 32px rgba(59, 130, 246, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)';
                  }
                }}
              >
                {/* Button background glow effect */}
                <div 
                  className="absolute inset-0 rounded-2xl opacity-50 group-hover:opacity-70 transition-opacity duration-300"
                  style={{
                    background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.2), rgba(139, 92, 246, 0.2))',
                    filter: 'blur(1px)'
                  }}
                ></div>
                
                <div className="relative z-10 flex items-center space-x-3">
                  {isLoading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Authenticating...</span>
                    </>
                  ) : (
                    <>
                      <span>Access Dashboard</span>
                      <div className="w-5 h-5 flex items-center justify-center">
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="group-hover:translate-x-1 transition-transform duration-300">
                          <path d="M1 8h14m-6-6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </div>
                    </>
                  )}
                </div>
              </button>
            </form>

            {/* Premium Security Notice */}
            <div className="mt-8 text-center">
              <div className="flex items-center justify-center space-x-2 text-sm" style={{ color: '#888888' }}>
                <div className="w-3 h-3 rounded-full bg-green-500/60 shadow-sm shadow-green-500/30"></div>
                <span className="font-medium">Secure Admin Access</span>
                <div className="w-px h-4 bg-gray-600"></div>
                <span>Session Auto-Expires</span>
              </div>
            </div>
          </div>
        </div>

        {/* Premium Footer */}
        <div className="text-center mt-12">
          <div className="space-y-2">
            <p className="text-lg font-medium bg-gradient-to-r from-gray-400 to-gray-300 bg-clip-text text-transparent">
              Lead Generation OS
            </p>
            <div className="flex items-center justify-center space-x-2 text-sm" style={{ color: '#666666' }}>
              <span>Powered by</span>
              <span className="font-semibold text-blue-400">Node AI</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;