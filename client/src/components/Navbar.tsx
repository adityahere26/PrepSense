import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Sparkles, LogOut, User as UserIcon, LayoutDashboard, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="sticky top-0 z-50 bg-white/80 border-b border-slate-200/80 backdrop-blur-md shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl bg-[#043c44] flex items-center justify-center shadow-md shadow-[#043c44]/20 group-hover:scale-105 transition-transform">
              <Sparkles className="w-5 h-5 text-teal-300" />
            </div>
            <span className="font-heading font-bold text-xl tracking-tight text-[#043c44]">
              Prep<span className="text-[#0d9488]">Sense</span>
            </span>
          </Link>

          {/* Nav links */}
          <nav className="flex items-center gap-6">
            <Link
              to="/"
              className="text-sm font-semibold text-slate-700 hover:text-[#043c44] transition-colors"
            >
              Home
            </Link>
            <Link
              to="/resources"
              className="text-sm font-semibold text-slate-700 hover:text-[#043c44] flex items-center gap-1.5 transition-colors"
            >
              <BookOpen className="w-4 h-4 text-[#0d9488]" />
              Resources
            </Link>
            {user && (
              <Link
                to="/dashboard"
                className="text-sm font-semibold text-slate-700 hover:text-[#043c44] flex items-center gap-1.5 transition-colors"
              >
                <LayoutDashboard className="w-4 h-4 text-[#0d9488]" />
                Dashboard
              </Link>
            )}
          </nav>

          {/* User / Auth State */}
          <div className="flex items-center gap-4">
            {user ? (
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-teal-50/80 border border-teal-200/60">
                  {user.picture ? (
                    <img
                      src={user.picture}
                      alt={user.name || 'User'}
                      className="w-6 h-6 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-[#043c44] text-teal-200 flex items-center justify-center text-xs font-semibold">
                      {(user.name || user.email)[0].toUpperCase()}
                    </div>
                  )}
                  <span className="text-xs font-semibold text-[#043c44] max-w-[120px] truncate">
                    {user.name || user.email}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleLogout}
                  className="p-2 h-auto w-auto text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  title="Sign Out"
                >
                  <LogOut className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <Button
                asChild
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-[#043c44] hover:bg-[#08545e] text-white shadow-sm transition-all flex items-center gap-1.5 h-auto border border-[#043c44]"
              >
                <Link to="/login">
                  <UserIcon className="w-3.5 h-3.5 text-teal-300" />
                  Sign In
                </Link>
              </Button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

