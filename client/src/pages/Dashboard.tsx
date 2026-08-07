import React from 'react';
import { useAuth } from '../context/AuthContext';
import { FileText, Mic, Sparkles, CheckCircle2, User, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';

export const Dashboard: React.FC = () => {
  const { user } = useAuth();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Header Banner */}
      <Card className="glass-panel p-8 rounded-3xl relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-6 border-indigo-500/20 ring-0 shadow-none">
        <div className="space-y-2 z-10">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-semibold">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Authenticated via OAuth & JWT
          </div>
          <h1 className="font-heading text-3xl font-extrabold text-white">
            Welcome back, {user?.name || user?.email}!
          </h1>
          <p className="text-slate-400 text-sm">
            {user?.targetRole
              ? `Target Role: ${user.targetRole}`
              : 'Target role not set yet — upload a resume to configure.'}
          </p>
        </div>

        <div className="flex items-center gap-3 z-10">
          <Button className="px-5 py-2.5 h-auto rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm transition-all shadow-md shadow-indigo-600/25 flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Upload Resume
          </Button>
        </div>

        {/* Glow decoration */}
        <div className="absolute -bottom-16 -right-16 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
      </Card>

      {/* Dashboard Stats / Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="glass-panel p-6 rounded-2xl space-y-3 border-slate-800 ring-0 shadow-none">
          <CardHeader className="p-0 flex flex-row items-center justify-between space-y-0 text-slate-400">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-slate-400 font-sans">User Account</CardTitle>
            <User className="w-4 h-4 text-indigo-400" />
          </CardHeader>
          <CardContent className="p-0 space-y-1">
            <p className="text-lg font-bold text-white truncate">{user?.email}</p>
            <CardDescription className="text-xs text-slate-500">ID: {user?.id}</CardDescription>
          </CardContent>
        </Card>

        <Card className="glass-panel p-6 rounded-2xl space-y-3 border-slate-800 ring-0 shadow-none">
          <CardHeader className="p-0 flex flex-row items-center justify-between space-y-0 text-slate-400">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-slate-400 font-sans">Resumes Parsed</CardTitle>
            <FileText className="w-4 h-4 text-purple-400" />
          </CardHeader>
          <CardContent className="p-0 space-y-1">
            <p className="text-3xl font-extrabold text-white">0</p>
            <CardDescription className="text-xs text-slate-500">Ready for Phase 1 Upload Flow</CardDescription>
          </CardContent>
        </Card>

        <Card className="glass-panel p-6 rounded-2xl space-y-3 border-slate-800 ring-0 shadow-none">
          <CardHeader className="p-0 flex flex-row items-center justify-between space-y-0 text-slate-400">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-slate-400 font-sans">Interview Sessions</CardTitle>
            <Mic className="w-4 h-4 text-pink-400" />
          </CardHeader>
          <CardContent className="p-0 space-y-1">
            <p className="text-3xl font-extrabold text-white">0</p>
            <CardDescription className="text-xs text-slate-500">Ready for Phase 3 Voice Module</CardDescription>
          </CardContent>
        </Card>
      </div>

      {/* Placeholder Empty State */}
      <Card className="glass-panel p-12 rounded-3xl text-center space-y-4 border-dashed border-slate-800 ring-0 shadow-none">
        <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center mx-auto">
          <Sparkles className="w-6 h-6" />
        </div>
        <CardHeader className="p-0">
          <CardTitle className="font-heading font-bold text-xl text-white">Your Workspace is Ready</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <CardDescription className="text-slate-400 text-sm max-w-md mx-auto">
            The monorepo architecture, Express JWT server, and protected React client route are successfully linked!
          </CardDescription>
        </CardContent>
      </Card>
    </div>
  );
};

