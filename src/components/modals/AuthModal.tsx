import React, { useState } from 'react';
import { X, User, Key, Mail, LogOut, CheckCircle2, AlertCircle } from 'lucide-react';
import { getSupabase } from '../../store/supabaseClient';
import { refreshSupabaseConnection, useCostingStore } from '../../store/costingStore';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const store = useCostingStore();

  const [mode, setMode] = useState<'signin' | 'signup' | 'reset'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  if (!isOpen) return null;

  const client = getSupabase();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (!client) {
      setMessage({
        type: 'error',
        text: 'Supabase is not configured yet. Go to Settings & Sync to enter your Supabase Project URL and Anon Key.',
      });
      return;
    }

    setLoading(true);

    try {
      if (mode === 'signin') {
        const { error } = await client.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) throw error;
        setMessage({ type: 'success', text: 'Successfully signed in!' });
        await refreshSupabaseConnection();
        setTimeout(onClose, 1200);
      } else if (mode === 'signup') {
        const { error } = await client.auth.signUp({
          email: email.trim(),
          password,
        });
        if (error) throw error;
        setMessage({
          type: 'success',
          text: 'Registration successful! Check your email for confirmation link if enabled.',
        });
        await refreshSupabaseConnection();
      } else if (mode === 'reset') {
        const { error } = await client.auth.resetPasswordForEmail(email.trim());
        if (error) throw error;
        setMessage({
          type: 'success',
          text: 'Password reset link sent to your email address.',
        });
      }
    } catch (err: unknown) {
      setMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Authentication failed.',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    if (!client) return;
    setLoading(true);
    await client.auth.signOut();
    await refreshSupabaseConnection();
    setLoading(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-sm w-full overflow-hidden border border-slate-200">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-sky-600" />
            <h3 className="font-bold text-slate-800 text-sm">
              {store.supabaseStatus.userEmail
                ? 'User Account'
                : mode === 'signin'
                ? 'Sign In to Costing Desk'
                : mode === 'signup'
                ? 'Create Costing Desk Account'
                : 'Reset Password'}
            </h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4 text-xs">
          {/* Active user status */}
          {store.supabaseStatus.userEmail ? (
            <div className="space-y-4">
              <div className="bg-slate-50 border border-slate-200 rounded p-3 text-slate-700">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">
                  Signed in as:
                </span>
                <span className="font-semibold text-sm">{store.supabaseStatus.userEmail}</span>
                <p className="text-[11px] text-emerald-600 font-medium mt-1">
                  Cloud session authenticated and active.
                </p>
              </div>

              <button
                onClick={handleSignOut}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-rose-50 hover:bg-rose-100 text-rose-700 font-semibold rounded border border-rose-200 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span>{loading ? 'Signing out...' : 'Sign Out'}</span>
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-3">
              {message && (
                <div
                  className={`p-2.5 rounded text-xs flex items-start gap-2 ${
                    message.type === 'success'
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      : 'bg-rose-50 text-rose-800 border border-rose-200'
                  }`}
                >
                  {message.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
                  )}
                  <span>{message.text}</span>
                </div>
              )}

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Email Address</label>
                <div className="relative">
                  <Mail className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    placeholder="user@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded pl-9 pr-3 py-2 text-slate-800 focus:bg-white focus:ring-1 focus:ring-sky-500 focus:outline-none"
                  />
                </div>
              </div>

              {mode !== 'reset' && (
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Password</label>
                  <div className="relative">
                    <Key className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="password"
                      required
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded pl-9 pr-3 py-2 text-slate-800 focus:bg-white focus:ring-1 focus:ring-sky-500 focus:outline-none"
                    />
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2 px-3 bg-sky-600 hover:bg-sky-700 text-white font-semibold rounded shadow-sm transition-colors mt-2"
              >
                {loading
                  ? 'Processing...'
                  : mode === 'signin'
                  ? 'Sign In'
                  : mode === 'signup'
                  ? 'Create Account'
                  : 'Send Reset Link'}
              </button>

              {/* Mode switch links */}
              <div className="pt-2 text-center text-slate-500 text-[11px] space-y-1">
                {mode === 'signin' && (
                  <>
                    <div>
                      Don&apos;t have an account?{' '}
                      <button
                        type="button"
                        onClick={() => {
                          setMode('signup');
                          setMessage(null);
                        }}
                        className="text-sky-600 hover:underline font-semibold"
                      >
                        Sign Up
                      </button>
                    </div>
                    <div>
                      <button
                        type="button"
                        onClick={() => {
                          setMode('reset');
                          setMessage(null);
                        }}
                        className="text-slate-400 hover:text-slate-600"
                      >
                        Forgot password?
                      </button>
                    </div>
                  </>
                )}

                {mode === 'signup' && (
                  <div>
                    Already have an account?{' '}
                    <button
                      type="button"
                      onClick={() => {
                        setMode('signin');
                        setMessage(null);
                      }}
                      className="text-sky-600 hover:underline font-semibold"
                    >
                      Sign In
                    </button>
                  </div>
                )}

                {mode === 'reset' && (
                  <div>
                    <button
                      type="button"
                      onClick={() => {
                        setMode('signin');
                        setMessage(null);
                      }}
                      className="text-sky-600 hover:underline font-semibold"
                    >
                      Back to Sign In
                    </button>
                  </div>
                )}
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
