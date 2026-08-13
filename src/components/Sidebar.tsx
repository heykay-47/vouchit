import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Info,
  LayoutDashboard,
  LogOut,
  Menu,
  Moon,
  Plus,
  Settings,
  Sun,
  Ticket,
  User,
  Users,
} from 'lucide-react';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { useAuth } from '@/contexts/AuthContext';
import { useAuthDialog } from '@/contexts/AuthDialogContext';
import { cn } from '@/lib/utils';

interface NavItem {
  icon: React.ElementType;
  label: string;
  path: string;
  authRequired: boolean;
}

const primaryNav: NavItem[] = [
  { icon: Ticket, label: 'browse', path: '/', authRequired: false },
  { icon: Plus, label: 'donate', path: '/donate', authRequired: false },
];

const secondaryNav: NavItem[] = [
  { icon: LayoutDashboard, label: 'dashboard', path: '/dashboard', authRequired: true },
  { icon: Users, label: 'community', path: '/community', authRequired: false },
  { icon: Settings, label: 'settings', path: '/settings', authRequired: true },
  { icon: Info, label: 'about', path: '/about', authRequired: false },
];

const desktopMediaQuery = '(min-width: 1024px)';

export default function Sidebar() {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [pendingAuthMode, setPendingAuthMode] = useState<'login' | 'signup' | null>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const { isAuthenticated, user, logout } = useAuth();
  const { openLogin, openSignup } = useAuthDialog();
  const { resolvedTheme, setTheme } = useTheme();
  const location = useLocation();
  const isDarkTheme = resolvedTheme === 'dark';

  useEffect(() => {
    const desktop = window.matchMedia(desktopMediaQuery);
    const closeMobileNavigation = (event: MediaQueryListEvent) => {
      if (event.matches) setIsMobileOpen(false);
    };

    desktop.addEventListener('change', closeMobileNavigation);
    return () => desktop.removeEventListener('change', closeMobileNavigation);
  }, []);

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  const NavLink = ({ item, onNavigate }: { item: NavItem; onNavigate?: () => void }) => {
    if (item.authRequired && !isAuthenticated) return null;

    const active = isActive(item.path);

    return (
      <Link
        to={item.path}
        aria-current={active ? 'page' : undefined}
        onClick={onNavigate}
        className={cn('nav-item min-h-11', active ? 'nav-item-active' : 'nav-item-inactive')}
      >
        <item.icon aria-hidden="true" className="h-5 w-5" />
        <span className="lowercase">{item.label}</span>
      </Link>
    );
  };

  const NavigationContent = ({
    onNavigate,
    onAuthHandoff,
  }: {
    onNavigate?: () => void;
    onAuthHandoff?: (mode: 'login' | 'signup') => void;
  }) => {
    const handleLogin = () => {
      if (onAuthHandoff) {
        onAuthHandoff('login');
        return;
      }
      openLogin();
    };

    const handleSignup = () => {
      if (onAuthHandoff) {
        onAuthHandoff('signup');
        return;
      }
      openSignup();
    };

    const handleLogout = () => {
      onNavigate?.();
      void logout();
    };

    return (
      <>
        <div className="flex items-center justify-between border-b border-sidebar-border p-4">
          <Link to="/" className="flex min-h-11 items-center gap-2" onClick={onNavigate}>
            <img src="/logo/vouchitLogo.png" alt="VouchIt" width="32" height="32" className="h-8 w-8 rounded-lg" />
            <span className="text-sm font-medium lowercase">vouchit</span>
          </Link>
        </div>

        <nav className="flex-1 space-y-1 p-3">
          {primaryNav.map((item) => (
            <NavLink key={item.path} item={item} onNavigate={onNavigate} />
          ))}

          <div className="my-4 h-px bg-sidebar-border" />

          {secondaryNav.map((item) => (
            <NavLink key={item.path} item={item} onNavigate={onNavigate} />
          ))}
        </nav>

        <div className="border-t border-sidebar-border p-3">
          {isAuthenticated ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2 px-3 py-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/20">
                  <User aria-hidden="true" className="h-4 w-4 text-primary" />
                </div>
                <span className="truncate text-sm lowercase text-muted-foreground">
                  {user?.username || 'user'}
                </span>
              </div>
              <button onClick={handleLogout} className="nav-item nav-item-inactive min-h-11 w-full text-left">
                <LogOut aria-hidden="true" className="h-5 w-5" />
                <span className="lowercase">log out</span>
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <Button variant="ghost" className="h-11 w-full justify-start lowercase" onClick={handleLogin}>
                log in
              </Button>
              <Button className="h-11 w-full text-black lowercase" onClick={handleSignup}>
                sign up
              </Button>
            </div>
          )}
          <Button
            type="button"
            variant="ghost"
            className="mt-2 h-11 w-full justify-start lowercase"
            aria-label={`switch to ${isDarkTheme ? 'light' : 'dark'} theme`}
            onClick={() => setTheme(isDarkTheme ? 'light' : 'dark')}
          >
            {isDarkTheme ? (
              <Sun aria-hidden="true" className="h-4 w-4" />
            ) : (
              <Moon aria-hidden="true" className="h-4 w-4" />
            )}
            {isDarkTheme ? 'light theme' : 'dark theme'}
          </Button>
        </div>
      </>
    );
  };

  return (
    <>
      <button
        ref={menuButtonRef}
        type="button"
        onClick={() => setIsMobileOpen(true)}
        aria-label="open menu"
        aria-expanded={isMobileOpen}
        aria-controls="mobile-navigation"
        className="fixed left-4 top-4 z-40 inline-flex h-11 w-11 items-center justify-center rounded-lg border border-border bg-card lg:hidden"
      >
        <Menu aria-hidden="true" className="h-5 w-5" />
      </button>

      <aside
        className="fixed left-0 top-0 hidden h-full w-56 flex-col border-r border-sidebar-border bg-sidebar lg:flex"
        aria-label="primary navigation"
      >
        <NavigationContent />
      </aside>

      <Dialog open={isMobileOpen} onOpenChange={setIsMobileOpen}>
        <DialogContent
          id="mobile-navigation"
          aria-describedby={undefined}
          motion="drawer"
          onCloseAutoFocus={(event) => {
            if (pendingAuthMode) {
              event.preventDefault();
              const mode = pendingAuthMode;
              setPendingAuthMode(null);
              if (mode === 'login') openLogin(menuButtonRef.current);
              else openSignup(menuButtonRef.current);
              return;
            }
            event.preventDefault();
            menuButtonRef.current?.focus();
          }}
          className="left-0 top-0 h-dvh max-h-dvh w-56 max-w-[85vw] translate-x-0 translate-y-0 gap-0 border-y-0 border-l-0 p-0 sm:w-56 sm:rounded-none"
        >
          <DialogTitle className="sr-only">vouchit navigation</DialogTitle>
          <NavigationContent
            onNavigate={() => setIsMobileOpen(false)}
            onAuthHandoff={(mode) => {
              setPendingAuthMode(mode);
              setIsMobileOpen(false);
            }}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
