import { useState, useEffect, lazy, Suspense } from "react";
import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { AuthProvider, useAuth } from "@/lib/auth";
import { ThemeProvider } from "@/components/theme-provider";
import { ThemeToggle } from "@/components/theme-toggle";

const NotFound = lazy(() => import("@/pages/not-found"));
const LandingPage = lazy(() => import("@/pages/landing"));
const LoginPage = lazy(() => import("@/pages/login"));
const RegisterPage = lazy(() => import("@/pages/register"));
const HomePage = lazy(() => import("@/pages/home"));
const QuickCheckPage = lazy(() => import("@/pages/quick-check"));
const ProjectsPage = lazy(() => import("@/pages/projects"));
const ProjectNewPage = lazy(() => import("@/pages/project-new"));
const ProjectDetailPage = lazy(() => import("@/pages/project-detail"));
const FileReviewPage = lazy(() => import("@/pages/file-review"));
const FileComparePage = lazy(() => import("@/pages/file-compare"));
const GuestReviewPage = lazy(() => import("@/pages/guest-review"));
const AccountSettingsPage = lazy(() => import("@/pages/account-settings"));

function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
    </div>
  );
}

function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex h-screen w-full">
        <AppSidebar />
        <div className="flex flex-col flex-1 overflow-hidden">
          <header className="flex items-center justify-between gap-2 px-4 py-2 border-b bg-card">
            <SidebarTrigger data-testid="button-sidebar-toggle" />
            <ThemeToggle />
          </header>
          <main className="flex-1 overflow-auto p-6">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

function FileReviewLayout({ children }: { children: React.ReactNode }) {
  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex h-screen w-full">
        <AppSidebar />
        <div className="flex flex-col flex-1 overflow-hidden">
          {children}
        </div>
      </div>
    </SidebarProvider>
  );
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoading && !user) {
      setLocation("/login");
    }
  }, [isLoading, user, setLocation]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return <>{children}</>;
}

function Router() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Switch>
        <Route path="/" component={LandingPage} />

        <Route path="/login" component={LoginPage} />

        <Route path="/register" component={RegisterPage} />

        <Route path="/s/:token" component={GuestReviewPage} />

        <Route path="/home">
          <ProtectedRoute>
            <AuthenticatedLayout>
              <Suspense fallback={<PageLoader />}>
                <HomePage />
              </Suspense>
            </AuthenticatedLayout>
          </ProtectedRoute>
        </Route>

        <Route path="/quick-check">
          <ProtectedRoute>
            <AuthenticatedLayout>
              <Suspense fallback={<PageLoader />}>
                <QuickCheckPage />
              </Suspense>
            </AuthenticatedLayout>
          </ProtectedRoute>
        </Route>

        <Route path="/account-settings">
          <ProtectedRoute>
            <AuthenticatedLayout>
              <Suspense fallback={<PageLoader />}>
                <AccountSettingsPage />
              </Suspense>
            </AuthenticatedLayout>
          </ProtectedRoute>
        </Route>

        <Route path="/dashboard">
          <ProtectedRoute>
            <AuthenticatedLayout>
              <Suspense fallback={<PageLoader />}>
                <HomePage />
              </Suspense>
            </AuthenticatedLayout>
          </ProtectedRoute>
        </Route>

        <Route path="/projects">
          <ProtectedRoute>
            <AuthenticatedLayout>
              <Suspense fallback={<PageLoader />}>
                <ProjectsPage />
              </Suspense>
            </AuthenticatedLayout>
          </ProtectedRoute>
        </Route>

        <Route path="/projects/new">
          <ProtectedRoute>
            <AuthenticatedLayout>
              <Suspense fallback={<PageLoader />}>
                <ProjectNewPage />
              </Suspense>
            </AuthenticatedLayout>
          </ProtectedRoute>
        </Route>

        <Route path="/projects/:id">
          <ProtectedRoute>
            <AuthenticatedLayout>
              <Suspense fallback={<PageLoader />}>
                <ProjectDetailPage />
              </Suspense>
            </AuthenticatedLayout>
          </ProtectedRoute>
        </Route>

        <Route path="/files/:id">
          <ProtectedRoute>
            <FileReviewLayout>
              <Suspense fallback={<PageLoader />}>
                <FileReviewPage />
              </Suspense>
            </FileReviewLayout>
          </ProtectedRoute>
        </Route>

        <Route path="/projects/:projectId/compare">
          <ProtectedRoute>
            <FileReviewLayout>
              <Suspense fallback={<PageLoader />}>
                <FileComparePage />
              </Suspense>
            </FileReviewLayout>
          </ProtectedRoute>
        </Route>

        <Route component={NotFound} />
      </Switch>
    </Suspense>
  );
}

function App() {
  return (
    <ThemeProvider defaultTheme="light" storageKey="checkback-theme">
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <AuthProvider>
            <Toaster />
            <Router />
          </AuthProvider>
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
