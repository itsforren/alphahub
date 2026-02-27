import { useBrowserNotifications } from '@/hooks/useBrowserNotifications';

export function BrowserNotificationProvider({ children }: { children: React.ReactNode }) {
  // Initialize browser notifications - this sets up all the real-time subscriptions
  useBrowserNotifications();
  
  return <>{children}</>;
}
