import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Home } from './pages/Home';
import { Login } from './pages/Login';
import { AuthCallback } from './pages/AuthCallback';
import { Dashboard } from './pages/Dashboard';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

export const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router>
          <div className="min-h-screen flex flex-col bg-[#f8fafc] text-slate-900 relative overflow-x-hidden">
            {/* Background Ambient Teal/Cyan Blurs matching reference image */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[600px] pointer-events-none z-0">
              <div className="absolute top-[-100px] left-[-150px] w-[500px] h-[500px] bg-teal-400/15 rounded-full blur-[120px]" />
              <div className="absolute top-[150px] right-[-150px] w-[550px] h-[550px] bg-cyan-400/20 rounded-full blur-[130px]" />
              <div className="absolute bottom-[-100px] left-[20%] w-[600px] h-[300px] bg-emerald-300/15 rounded-full blur-[100px]" />
            </div>

            <Navbar />
            <main className="flex-1 relative z-10">
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/login" element={<Login />} />
                <Route path="/auth/callback" element={<AuthCallback />} />
                <Route
                  path="/dashboard"
                  element={
                    <ProtectedRoute>
                      <Dashboard />
                    </ProtectedRoute>
                  }
                />
              </Routes>
            </main>
          </div>
        </Router>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;
