import { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  LayoutDashboard, 
  Users, 
  HelpCircle,
  Menu, 
  X, 
  LogOut, 
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  BookOpen,
  User,
  Settings,
  MessageCircle,
  TrendingUp,
  UserPlus,
  MessageSquare,
  Ticket,
  BarChart3,
  Target,
  DollarSign,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { NavLink } from '@/components/NavLink';
import { ChatBubble } from '@/components/portal/chat/ChatBubble';
import { LeadIntelPill } from '@/components/hub/LeadIntelModal';
import { ClientPreviewBanner } from '@/components/hub/ClientPreviewBanner';
import { MaintenanceBanner } from '@/components/hub/MaintenanceBanner';
import { CampaignUpdateBanner } from '@/components/hub/CampaignUpdateBanner';
import { PlatformUpdateBanner } from '@/components/hub/PlatformUpdateBanner';
import { NotificationBell } from '@/components/admin/NotificationBell';
import { useUnreadCount } from '@/hooks/useChat';
import { cn } from '@/lib/utils';

interface NavItem {
  to: string;
  icon: React.ElementType;
  label: string;
  end?: boolean;
}

interface NavSection {
  title: string | null;
  items: NavItem[];
  defaultOpen?: boolean;
}

const mainNavSections: NavSection[] = [
  {
    title: null,
    items: [
      { to: '/hub', icon: LayoutDashboard, label: 'My Portal', end: true },
    ],
  },
  {
    title: 'My Business',
    defaultOpen: true,
    items: [
      { to: '/hub/referrals', icon: UserPlus, label: 'Referrals' },
    ],
  },
  {
    title: 'Learn',
    defaultOpen: true,
    items: [
      { to: '/hub/courses', icon: BookOpen, label: 'Courses' },
      { to: '/hub/community', icon: MessageSquare, label: 'Community' },
    ],
  },
  {
    title: 'Support',
    defaultOpen: true,
    items: [
      { to: '/hub/chat', icon: MessageCircle, label: 'Chat with Team' },
      { to: '/hub/support', icon: Ticket, label: 'Support Tickets' },
    ],
  },
];

const adminNavSections: NavSection[] = [
  {
    title: null,
    items: [
      { to: '/hub/admin/clients', icon: Users, label: 'All Clients' },
    ],
  },
  {
    title: 'Operations',
    defaultOpen: true,
    items: [
      { to: '/hub/admin/command', icon: BarChart3, label: 'Command Center' },
      { to: '/hub/admin/chat', icon: MessageCircle, label: 'Chat' },
      { to: '/hub/admin/billing', icon: DollarSign, label: 'Billing' },
    ],
  },
  {
    title: 'Growth',
    defaultOpen: true,
    items: [
      { to: '/hub/admin/sales', icon: Target, label: 'Sales' },
      { to: '/hub/admin/analytics', icon: TrendingUp, label: 'Analytics' },
    ],
  },
  {
    title: 'Admin',
    defaultOpen: true,
    items: [
      { to: '/hub/admin/courses', icon: BookOpen, label: 'Courses' },
      { to: '/hub/admin/settings', icon: Settings, label: 'Settings' },
    ],
  },
];

interface NavItemComponentProps {
  to: string;
  icon: React.ElementType;
  label: string;
  collapsed: boolean;
  end?: boolean;
  badge?: number;
}

function NavItemComponent({ to, icon: Icon, label, collapsed, end, badge }: NavItemComponentProps) {
  const content = (
    <NavLink
      to={to}
      end={end}
      className="flex items-center gap-3 px-3 py-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/5 transition-all duration-200 relative"
      activeClassName="bg-primary/10 text-primary border border-primary/20"
    >
      <div className="relative">
        <Icon className="w-5 h-5 flex-shrink-0" />
        {badge !== undefined && badge > 0 && collapsed && (
          <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-[16px] bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full flex items-center justify-center px-0.5">
            {badge > 9 ? '9+' : badge}
          </span>
        )}
      </div>
      {!collapsed && (
        <span className="font-medium text-sm flex-1">{label}</span>
      )}
      {!collapsed && badge !== undefined && badge > 0 && (
        <span className="min-w-[20px] h-[20px] bg-destructive text-destructive-foreground text-xs font-bold rounded-full flex items-center justify-center px-1">
          {badge > 9 ? '9+' : badge}
        </span>
      )}
    </NavLink>
  );

  if (collapsed) {
    return (
      <Tooltip delayDuration={0}>
        <TooltipTrigger asChild>{content}</TooltipTrigger>
        <TooltipContent side="right" className="bg-card border-white/10">
          {label} {badge && badge > 0 ? `(${badge})` : ''}
        </TooltipContent>
      </Tooltip>
    );
  }

  return content;
}

interface NavSectionComponentProps {
  section: NavSection;
  collapsed: boolean;
  isActive: (path: string) => boolean;
  getBadge?: (to: string) => number | undefined;
}

function NavSectionComponent({ section, collapsed, isActive, getBadge }: NavSectionComponentProps) {
  const hasActiveItem = section.items.some(item => isActive(item.to));
  const [open, setOpen] = useState(section.defaultOpen || hasActiveItem);

  useEffect(() => {
    if (hasActiveItem) setOpen(true);
  }, [hasActiveItem]);

  if (!section.title) {
    return (
      <div className="space-y-1">
        {section.items.map((item) => (
          <NavItemComponent key={item.to} {...item} collapsed={collapsed} badge={getBadge?.(item.to)} />
        ))}
      </div>
    );
  }

  if (collapsed) {
    return (
      <div className="space-y-1 pt-2">
        <div className="h-px bg-white/10 mx-2 mb-2" />
        {section.items.map((item) => (
          <NavItemComponent key={item.to} {...item} collapsed={collapsed} badge={getBadge?.(item.to)} />
        ))}
      </div>
    );
  }

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="pt-2">
      <CollapsibleTrigger className="flex items-center justify-between w-full px-3 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors">
        <span>{section.title}</span>
        <ChevronDown className={cn("w-3 h-3 transition-transform", open && "rotate-180")} />
      </CollapsibleTrigger>
      <CollapsibleContent className="space-y-1 mt-1">
        {section.items.map((item) => (
          <NavItemComponent key={item.to} {...item} collapsed={collapsed} badge={getBadge?.(item.to)} />
        ))}
      </CollapsibleContent>
    </Collapsible>
  );
}

export default function AgentHubLayout() {
  const { user, profile, role, signOut, isAdmin, isReferrer } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(() => {
    const saved = localStorage.getItem('hub-sidebar-collapsed');
    return saved ? JSON.parse(saved) : false;
  });

  // Get unread count for chat badge
  const { data: unreadCount = 0 } = useUnreadCount(isAdmin);

  useEffect(() => {
    localStorage.setItem('hub-sidebar-collapsed', JSON.stringify(collapsed));
  }, [collapsed]);

  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const displayName = profile?.name || user?.email?.split('@')[0] || 'User';

  const isActive = (path: string) => {
    if (path === '/hub') return location.pathname === '/hub';
    return location.pathname.startsWith(path);
  };

  // Get badge count for specific nav items
  const getBadge = (to: string): number | undefined => {
    if (to === '/hub/chat') return unreadCount;
    if (to === '/hub/admin/inbox') return unreadCount;
    return undefined;
  };

  // Admin-only main section — no dashboard (it goes nowhere for admins)
  const adminOnlyMainSections: NavSection[] = [];

  // Referrer-only sections (just referrals page)
  const referrerNavSections: NavSection[] = [
    {
      title: null,
      items: [
        { to: '/hub/referrals', icon: UserPlus, label: 'My Referrals', end: true },
      ],
    },
  ];

  // Admins see admin pages, referrers see only referrals, regular users see full nav
  const allSections = isAdmin 
    ? [...adminOnlyMainSections, ...adminNavSections] 
    : isReferrer
      ? referrerNavSections
      : mainNavSections;

  return (
    <div className="min-h-screen bg-background flex w-full">
      {/* Desktop Sidebar */}
      <motion.aside
        initial={false}
        animate={{ width: collapsed ? 72 : 280 }}
        transition={{ duration: 0.2, ease: 'easeInOut' }}
        className="hidden lg:flex flex-col fixed left-0 top-0 h-screen bg-card/50 backdrop-blur-xl border-r border-white/5 z-40"
      >
        {/* Logo */}
        <div className={`flex items-center ${collapsed ? 'justify-center' : 'justify-between'} h-16 px-4 border-b border-white/5`}>
          {!collapsed && (
            <div className="flex items-center gap-1">
              <span className="text-xl font-light tracking-tight text-foreground">ALPHA</span>
              <span className="text-xl font-bold tracking-tight text-primary">HUB</span>
            </div>
          )}
          {collapsed && (
            <span className="text-xl font-bold text-primary">A</span>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCollapsed(!collapsed)}
            className={cn("h-8 w-8 text-muted-foreground hover:text-foreground", collapsed && "absolute -right-3 bg-card border border-white/10")}
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </Button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {allSections.map((section, index) => (
            <NavSectionComponent 
              key={section.title || index} 
              section={section} 
              collapsed={collapsed}
              isActive={isActive}
              getBadge={getBadge}
            />
          ))}
        </nav>

        {/* Notification Bell (admin only) */}
        {isAdmin && (
          <div className={`px-3 py-2 border-t border-white/5 ${collapsed ? 'flex justify-center' : ''}`}>
            <NotificationBell />
          </div>
        )}

        {/* User Menu */}
        <div className="p-3 border-t border-white/5">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className={`w-full ${collapsed ? 'justify-center px-0' : 'justify-start'} gap-3 h-auto py-2`}
              >
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-medium text-primary-foreground">
                    {displayName.charAt(0).toUpperCase()}
                  </span>
                </div>
                {!collapsed && (
                  <div className="flex-1 text-left">
                    <p className="text-sm font-medium truncate">{displayName}</p>
                    <p className="text-xs text-muted-foreground capitalize">{role}</p>
                  </div>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 bg-card border-white/10">
              <DropdownMenuItem onClick={() => navigate('/hub/profile')}>
                <User className="w-4 h-4 mr-2" />
                Profile
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate('/hub/settings')}>
                <Settings className="w-4 h-4 mr-2" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-white/10" />
              <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </motion.aside>

      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-card/80 backdrop-blur-xl border-b border-white/5 z-40 flex items-center justify-between px-4">
        <div className="flex items-center gap-1">
          <span className="text-lg font-light tracking-tight text-foreground">ALPHA</span>
          <span className="text-lg font-bold tracking-tight text-primary">HUB</span>
        </div>
        <div className="flex items-center gap-1">
          {isAdmin && <NotificationBell />}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </Button>
        </div>
      </div>

      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="lg:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
              onClick={() => setSidebarOpen(false)}
            />
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="lg:hidden fixed left-0 top-0 h-screen w-80 bg-card/95 backdrop-blur-xl border-r border-white/5 z-50 flex flex-col"
            >
              <div className="flex items-center justify-between h-16 px-4 border-b border-white/5">
                <div className="flex items-center gap-1">
                  <span className="text-xl font-light tracking-tight text-foreground">ALPHA</span>
                  <span className="text-xl font-bold tracking-tight text-primary">HUB</span>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(false)}>
                  <X className="w-5 h-5" />
                </Button>
              </div>

              <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
                {allSections.map((section, index) => (
                  <NavSectionComponent 
                    key={section.title || index} 
                    section={section} 
                    collapsed={false}
                    isActive={isActive}
                    getBadge={getBadge}
                  />
                ))}
              </nav>

              <div className="p-4 border-t border-white/5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                    <span className="text-sm font-medium text-primary-foreground">
                      {displayName.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <p className="font-medium">{displayName}</p>
                    <p className="text-xs text-muted-foreground capitalize">{role}</p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  onClick={handleSignOut}
                  className="w-full justify-start gap-2 text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </Button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main 
        className={`flex-1 pt-16 lg:pt-0 transition-all duration-200 ${
          collapsed ? 'lg:pl-[72px]' : 'lg:pl-[280px]'
        }`}
      >
        <MaintenanceBanner />
        <CampaignUpdateBanner />
        <PlatformUpdateBanner />
        <ClientPreviewBanner />
        <Outlet />
      </main>
      
      {/* Lead Intel pill (for clients) */}
      {!isAdmin && <LeadIntelPill />}

      {/* Floating Chat Bubble (for clients only) */}
      <ChatBubble />
    </div>
  );
}
