import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { CalculatorProvider } from "@/contexts/CalculatorContext";
import { NotificationProvider } from "@/contexts/NotificationContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { ClientPreviewProvider } from "@/contexts/ClientPreviewContext";
import { BrowserNotificationProvider } from "@/components/BrowserNotificationProvider";
import { lazy, Suspense } from "react";
import { Loader2 } from "lucide-react";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { useAuth } from "@/contexts/AuthContext";

function HubIndex() {
  const { isAdmin } = useAuth();
  if (isAdmin) return <Navigate to="/hub/admin/clients" replace />;
  return <PortalAdminClientDetail />;
}

// Public pages
import Index from "./pages/Index";
import BookCall from "./pages/BookCall";
import ScheduleOnboarding from "./pages/ScheduleOnboarding";
import Admin from "./pages/Admin";
import Privacy from "./pages/Privacy";
import Terms from "./pages/Terms";
import About from "./pages/About";
import Blog from "./pages/Blog";
import BlogPost from "./pages/BlogPost";
import Pricing from "./pages/Pricing";
import Partner from "./pages/Partner";
import PartnerPricing from "./pages/PartnerPricing";
import BookPartnerCall from "./pages/BookPartnerCall";
import CallConfirmed from "./pages/CallConfirmed";
import FollowUpCallVideo from "./pages/FollowUpCallVideo";
import Welcome from "./pages/Welcome";
import NotFound from "./pages/NotFound";
import NotQualifiedLicense from "./pages/NotQualifiedLicense";
import NotQualifiedBudget from "./pages/NotQualifiedBudget";
import Apply from "./pages/Apply";
import Onboarding from "./pages/Onboarding";

// SEO Comparison pages
import BestIulLeads from "./pages/BestIulLeads";
import AlphaAgentVsJucebox from "./pages/AlphaAgentVsJucebox";
import ExclusiveVsAgedLeads from "./pages/ExclusiveVsAgedLeads";

// Auth pages (lazy loaded)
const Login = lazy(() => import("./pages/auth/Login"));
const ForgotPassword = lazy(() => import("./pages/auth/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/auth/ResetPassword"));

// App pages (lazy loaded)
const ProtectedRoute = lazy(() => import("./components/app/ProtectedRoute"));
const Courses = lazy(() => import("./pages/app/Courses"));
const CourseDetail = lazy(() => import("./pages/app/CourseDetail"));
const LessonView = lazy(() => import("./pages/app/LessonView"));
const CommunityFeed = lazy(() => import("./pages/app/CommunityFeed"));
const Profile = lazy(() => import("./pages/app/Profile"));
const Settings = lazy(() => import("./pages/app/Settings"));
const AdminDashboard = lazy(() => import("./pages/app/admin/AdminDashboard"));
const AdminUsers = lazy(() => import("./pages/app/admin/AdminUsers"));
const AdminCourses = lazy(() => import("./pages/app/admin/AdminCourses"));

// Portal pages (lazy loaded)
const PortalSupport = lazy(() => import("./pages/portal/Support"));
const PortalChat = lazy(() => import("./pages/portal/Chat"));
const PortalAdminClients = lazy(() => import("./pages/portal/admin/Clients"));
const PortalAdminClientDetail = lazy(() => import("./pages/portal/admin/ClientDetail"));
const PortalAdminSettings = lazy(() => import("./pages/portal/admin/Settings"));
const ArchivedClients = lazy(() => import("./pages/portal/admin/ArchivedClients"));

// NEW: Unified Agent Hub (lazy loaded)
const AgentHubLayout = lazy(() => import("./components/hub/AgentHubLayout"));
const HubReferrals = lazy(() => import("./pages/hub/Referrals"));
const HubLeads = lazy(() => import("./pages/hub/Leads"));
const HubProfile = lazy(() => import("./pages/hub/Profile"));
const HubSettings = lazy(() => import("./pages/hub/Settings"));
const SignAgreement = lazy(() => import("./pages/hub/SignAgreement"));

// CONSOLIDATED Admin Pages
const CommandCenter = lazy(() => import("./pages/hub/admin/CommandCenter"));
const UnifiedChat = lazy(() => import("./pages/hub/admin/UnifiedChat"));
const UnifiedSales = lazy(() => import("./pages/hub/admin/UnifiedSales"));
const TVAnalytics = lazy(() => import("./pages/hub/admin/TVAnalytics"));
const GHLBridge = lazy(() => import("./pages/hub/admin/GHLBridge"));
const BillingDashboard = lazy(() => import("./pages/hub/admin/BillingDashboard"));

// Legacy pages still needed for settings consolidation
const TicketDashboard = lazy(() => import("./pages/hub/admin/TicketDashboard"));
const AdminBanking = lazy(() => import("./pages/admin/AdminBanking"));

const queryClient = new QueryClient();

const LoadingFallback = () => (
  <div className="min-h-screen bg-background flex items-center justify-center">
    <Loader2 className="w-8 h-8 animate-spin text-primary" />
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <CalculatorProvider>
        <NotificationProvider>
          <AuthProvider>
            <BrowserNotificationProvider>
              <BrowserRouter>
                <ClientPreviewProvider>
                  <Toaster />
                  <Sonner />
                <ErrorBoundary>
                <Suspense fallback={<LoadingFallback />}>
                  <Routes>
                  {/* Public routes */}
                  <Route path="/" element={<Index />} />
                  <Route path="/book-call" element={<BookCall />} />
                  <Route path="/schedule-onboarding" element={<ScheduleOnboarding />} />
                  <Route path="/admin" element={<Admin />} />
                  <Route path="/privacy" element={<Privacy />} />
                  <Route path="/terms" element={<Terms />} />
                  <Route path="/about" element={<About />} />
                  <Route path="/blog" element={<Blog />} />
                  <Route path="/blog/:slug" element={<BlogPost />} />
                  <Route path="/pricing" element={<Pricing />} />
                  <Route path="/best-iul-leads" element={<BestIulLeads />} />
                  <Route path="/alpha-agent-vs-jucebox" element={<AlphaAgentVsJucebox />} />
                  <Route path="/exclusive-vs-aged-leads" element={<ExclusiveVsAgedLeads />} />
                  <Route path="/partner" element={<Partner />} />
                  <Route path="/partner-pricing" element={<PartnerPricing />} />
                  <Route path="/book-partner-call" element={<BookPartnerCall />} />
                  <Route path="/call-confirmed" element={<CallConfirmed />} />
                  <Route path="/follow-up-call-video" element={<FollowUpCallVideo />} />
                  <Route path="/welcome" element={<Welcome />} />
                  <Route path="/not-qualified-license" element={<NotQualifiedLicense />} />
                  <Route path="/not-qualified-budget" element={<NotQualifiedBudget />} />
                  <Route path="/apply" element={<Apply />} />
                  <Route path="/onboarding" element={<Onboarding />} />
                  
                  {/* Auth routes */}
                  <Route path="/login" element={<Login />} />
                  <Route path="/signup" element={<Navigate to="/login" replace />} />
                  <Route path="/auth/login" element={<Navigate to="/login" replace />} />
                  <Route path="/forgot-password" element={<ForgotPassword />} />
                  <Route path="/reset-password" element={<ResetPassword />} />

                  {/* Full-screen agreement signing (outside of hub layout) */}
                  <Route path="/hub/sign-agreement" element={
                    <ProtectedRoute>
                      <SignAgreement />
                    </ProtectedRoute>
                  } />
                  
                  {/* NEW: Unified Agent Hub routes */}
                  <Route path="/hub" element={
                    <ProtectedRoute>
                      <AgentHubLayout />
                    </ProtectedRoute>
                  }>
                    <Route index element={<HubIndex />} />
                    
                    {/* My Business - redirect old routes to hub */}
                    <Route path="portal" element={<Navigate to="/hub" replace />} />
                    <Route path="performance" element={<Navigate to="/hub" replace />} />
                    <Route path="billing" element={<Navigate to="/hub" replace />} />
                    <Route path="referrals" element={<HubReferrals />} />
                    <Route path="leads" element={<HubLeads />} />

                    {/* Learn */}
                    <Route path="courses" element={<Courses />} />
                    <Route path="courses/:courseId" element={<CourseDetail />} />
                    <Route path="courses/:courseId/:lessonId" element={<LessonView />} />
                    <Route path="community" element={<CommunityFeed />} />
                    
                    {/* Support */}
                    <Route path="chat" element={<PortalChat />} />
                    <Route path="support" element={<PortalSupport />} />
                    
                    {/* User */}
                    <Route path="profile" element={<HubProfile />} />
                    <Route path="settings" element={<HubSettings />} />
                    
                    {/* ===== ADMIN ROUTES (CONSOLIDATED) ===== */}
                    
                    {/* All Clients */}
                    <Route path="admin/clients" element={
                      <ProtectedRoute requiredRole="admin">
                        <PortalAdminClients />
                      </ProtectedRoute>
                    } />
                    <Route path="admin/clients/:id" element={
                      <ProtectedRoute requiredRole="admin">
                        <PortalAdminClientDetail />
                      </ProtectedRoute>
                    } />
                    <Route path="admin/clients/archived" element={
                      <ProtectedRoute requiredRole="admin">
                        <ArchivedClients />
                      </ProtectedRoute>
                    } />
                    
                    {/* Command Center (Campaigns, Lead Router, Change Log, Settings) */}
                    <Route path="admin/command" element={
                      <ProtectedRoute requiredRole="admin">
                        <CommandCenter />
                      </ProtectedRoute>
                    } />
                    
                    {/* Unified Chat (Client Inbox, Team Chat) */}
                    <Route path="admin/chat" element={
                      <ProtectedRoute requiredRole="admin">
                        <UnifiedChat />
                      </ProtectedRoute>
                    } />
                    
                    {/* Sales (Pipeline, Attribution, Referrals) */}
                    <Route path="admin/sales" element={
                      <ProtectedRoute requiredRole="admin">
                        <UnifiedSales />
                      </ProtectedRoute>
                    } />
                    
                    {/* TV Analytics (Marketing, Client Success) */}
                    <Route path="admin/analytics" element={
                      <ProtectedRoute requiredRole="admin">
                        <TVAnalytics />
                      </ProtectedRoute>
                    } />
                    
                    {/* Courses Admin */}
                    <Route path="admin/courses" element={
                      <ProtectedRoute requiredRole="admin">
                        <AdminCourses />
                      </ProtectedRoute>
                    } />
                    
                    {/* Settings (includes Users, GHL Bridge) */}
                    <Route path="admin/settings" element={
                      <ProtectedRoute requiredRole="admin">
                        <PortalAdminSettings />
                      </ProtectedRoute>
                    } />
                    <Route path="admin/users" element={
                      <ProtectedRoute requiredRole="admin">
                        <AdminUsers />
                      </ProtectedRoute>
                    } />
                    <Route path="admin/ghl-bridge" element={
                      <ProtectedRoute requiredRole="admin">
                        <GHLBridge />
                      </ProtectedRoute>
                    } />
                    
                    {/* Tickets (kept for now, could be merged into Chat) */}
                    <Route path="admin/tickets" element={
                      <ProtectedRoute requiredRole="admin">
                        <TicketDashboard />
                      </ProtectedRoute>
                    } />
                    
                    {/* Admin Dashboard */}
                    <Route path="admin" element={
                      <ProtectedRoute requiredRole="admin">
                        <AdminDashboard />
                      </ProtectedRoute>
                    } />
                    
                    {/* ===== REDIRECTS FOR OLD ROUTES ===== */}
                    <Route path="admin/inbox" element={<Navigate to="/hub/admin/chat?tab=inbox" replace />} />
                    <Route path="admin/team-chat" element={<Navigate to="/hub/admin/chat?tab=team" replace />} />
                    <Route path="admin/lead-stats" element={<Navigate to="/hub/admin/command?tab=router" replace />} />
                    <Route path="admin/campaign-changes" element={<Navigate to="/hub/admin/command?tab=changes" replace />} />
                    <Route path="admin/campaign-settings" element={<Navigate to="/hub/admin/command?tab=settings" replace />} />
                    <Route path="admin/attribution" element={<Navigate to="/hub/admin/sales?tab=attribution" replace />} />
                    <Route path="admin/referrals" element={<Navigate to="/hub/admin/sales?tab=referrals" replace />} />
                    <Route path="tv/marketing" element={<Navigate to="/hub/admin/analytics?view=marketing" replace />} />
                    <Route path="tv/finance" element={<Navigate to="/hub/admin/analytics" replace />} />
                    <Route path="tv/success" element={<Navigate to="/hub/admin/analytics?view=success" replace />} />
                    
                    {/* Billing Dashboard */}
                    <Route path="admin/billing" element={
                      <ProtectedRoute requiredRole="admin">
                        <BillingDashboard />
                      </ProtectedRoute>
                    } />
                    
                    {/* Removed finance routes - redirect to clients */}
                    <Route path="admin/banking" element={
                      <ProtectedRoute requiredRole="admin">
                        <AdminBanking />
                      </ProtectedRoute>
                    } />
                    <Route path="admin/expenses" element={<Navigate to="/hub/admin/clients" replace />} />
                    <Route path="admin/expense-rules" element={<Navigate to="/hub/admin/clients" replace />} />
                  </Route>

                  {/* OLD: Protected App routes - redirect to hub */}
                  <Route path="/app" element={<Navigate to="/hub" replace />} />
                  <Route path="/app/*" element={<Navigate to="/hub" replace />} />

                  {/* OLD: Portal routes - redirect to hub */}
                  <Route path="/portal" element={<Navigate to="/hub/portal" replace />} />
                  <Route path="/portal/*" element={<Navigate to="/hub/portal" replace />} />
                  
                  {/* Redirects for old Webflow URLs */}
                  <Route path="/blogs" element={<Navigate to="/blog" replace />} />
                  <Route path="/get-started" element={<Navigate to="/book-call" replace />} />
                  <Route path="/schedule-call" element={<Navigate to="/book-call" replace />} />
                  <Route path="/spanish-schedule-call" element={<Navigate to="/book-call" replace />} />
                  <Route path="/submit-your-application-here" element={<Navigate to="/book-call" replace />} />
                  <Route path="/schedule-your-interview-here" element={<Navigate to="/book-call" replace />} />
                  <Route path="/privacy-policy" element={<Navigate to="/privacy" replace />} />
                  <Route path="/terms-and-condition" element={<Navigate to="/terms" replace />} />
                  <Route path="/agent-launchpad" element={<Navigate to="/" replace />} />
                  <Route path="/team/*" element={<Navigate to="/" replace />} />
                  <Route path="/jobs/*" element={<Navigate to="/" replace />} />
                  <Route path="/post/*" element={<Navigate to="/" replace />} />
                  <Route path="/feature/*" element={<Navigate to="/" replace />} />
                  <Route path="/usecase/*" element={<Navigate to="/" replace />} />
                  <Route path="/integration/*" element={<Navigate to="/" replace />} />
                    
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                  </Suspense>
                </ErrorBoundary>
                </ClientPreviewProvider>
              </BrowserRouter>
            </BrowserNotificationProvider>
          </AuthProvider>
        </NotificationProvider>
      </CalculatorProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;