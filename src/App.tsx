import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, Outlet } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { AuthDialogProvider } from "@/contexts/AuthDialogContext";
import { VoucherProvider } from "./contexts/VoucherContext";
import { ThemeProvider } from "./contexts/ThemeContext";
import { lazy, Suspense, Component, ReactNode } from 'react';
import LoadingScreen from "./components/LoadingScreen";
import RoleRoute from "./components/RoleRoute";
import Sidebar from "./components/Sidebar";
import { logger } from '@/utils/logger';

// Lazy load pages for better performance
const Index = lazy(() => import("./pages/Index"));
const Browse = lazy(() => import("./pages/Browse"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Donate = lazy(() => import("./pages/Donate"));
const Settings = lazy(() => import("./pages/Settings"));
const About = lazy(() => import("./pages/About"));
const Community = lazy(() => import("./pages/Community"));
const BusinessDashboard = lazy(() => import("./pages/business/BusinessDashboard"));
const CampaignWorkspace = lazy(() => import("./pages/business/CampaignWorkspace"));
const NotFound = lazy(() => import("./pages/NotFound"));

// Error Boundary Component
interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

class AppErrorBoundary extends Component<{ children: ReactNode }, ErrorBoundaryState> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    logger.fatal('Application Error', error, {
      component: 'AppErrorBoundary',
      errorInfo,
      componentStack: errorInfo.componentStack,
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="text-center p-8">
            <h1 className="text-2xl font-medium lowercase mb-4">something went wrong</h1>
            <p className="text-muted-foreground mb-4">
              we're sorry, but something unexpected happened. please try refreshing.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 lowercase"
            >
              refresh page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Optimized QueryClient configuration
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5 * 60 * 1000,
      gcTime: 30 * 60 * 1000,
      refetchOnReconnect: true,
      refetchOnMount: true,
      networkMode: 'online',
    },
    mutations: {
      retry: 0,
      networkMode: 'online',
    }
  }
});

const basename = import.meta.env.BASE_URL || '/';

function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAuth();
  if (isLoading) return <LoadingScreen />;
  if (!user) return <Navigate to="/" replace />;
  return <>{children}</>;
}

// Operating routes share the sidebar while the landing route stays standalone.
function OperatingLayout() {
  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <main className="lg:ml-56 min-h-screen">
        <div className="max-w-4xl mx-auto px-4 py-8 pt-16 lg:pt-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

const App = () => (
  <AppErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <ThemeProvider>
          <AuthProvider>
            <BrowserRouter basename={basename}>
              <AuthDialogProvider>
                <VoucherProvider>
                  <Toaster />
                  <Sonner />
                  <Analytics />
                  <SpeedInsights />
                  <Suspense fallback={<LoadingScreen />}>
                    <Routes>
                      <Route path="/" element={<Index />} />
                      <Route element={<OperatingLayout />}>
                        <Route path="/browse" element={<Browse />} />
                        <Route path="/donate" element={<RoleRoute role="customer"><Donate /></RoleRoute>} />
                        <Route path="/dashboard" element={<RoleRoute role="customer"><Dashboard /></RoleRoute>} />
                        <Route path="/business" element={<RoleRoute role="business"><BusinessDashboard /></RoleRoute>} />
                        <Route path="/business/campaigns" element={<RoleRoute role="business"><BusinessDashboard /></RoleRoute>} />
                        <Route path="/business/campaigns/new" element={<RoleRoute role="business"><CampaignWorkspace /></RoleRoute>} />
                        <Route path="/business/campaigns/:id" element={<RoleRoute role="business"><CampaignWorkspace /></RoleRoute>} />
                        <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
                        <Route path="/about" element={<About />} />
                        <Route path="/community" element={<Community />} />
                        <Route path="*" element={<NotFound />} />
                      </Route>
                    </Routes>
                  </Suspense>
                </VoucherProvider>
              </AuthDialogProvider>
            </BrowserRouter>
          </AuthProvider>
        </ThemeProvider>
      </TooltipProvider>
    </QueryClientProvider>
  </AppErrorBoundary>
);

export default App;
