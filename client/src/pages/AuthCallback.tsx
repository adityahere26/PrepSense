import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Loader2 } from 'lucide-react';

export const AuthCallback: React.FC = () => {
  const [searchParams] = useSearchParams();
  const { handleTokenReceived } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const token = searchParams.get('token');
    if (token) {
      handleTokenReceived(token)
        .then(() => {
          navigate('/dashboard', { replace: true });
        })
        .catch((err) => {
          console.error('Failed to complete authentication:', err);
          navigate('/login?error=token_failed', { replace: true });
        });
    } else {
      navigate('/login?error=missing_token', { replace: true });
    }
  }, [searchParams, handleTokenReceived, navigate]);

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center gap-3">
      <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
      <p className="text-sm text-slate-400 font-medium">Authenticating & setting up session...</p>
    </div>
  );
};
