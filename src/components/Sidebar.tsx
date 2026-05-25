import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import AuthModal from './AuthModal';
import { 
  Ticket, 
  Plus, 
  LayoutDashboard, 
  Settings, 
  Info,
  Menu,
  X,
  LogOut,
  User,
  Users
} from 'lucide-react';
import { Button } from '@/components/ui/button';

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

export default function Sidebar() {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const { isAuthenticated, user, logout } = useAuth();
  const location = useLocation();

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  const openLogin = () => {
    setAuthMode('login');
    setIsAuthModalOpen(true);
    setIsMobileOpen(false);
  };

  const openSignup = () => {
    setAuthMode('signup');
    setIsAuthModalOpen(true);
    setIsMobileOpen(false);
  };

  const handleLogout = () => {
    logout();
    setIsMobileOpen(false);
  };

  const NavLink = ({ item, onClick }: { item: NavItem; onClick?: () => void }) => {
    if (item.authRequired && !isAuthenticated) return null;
    
    return (
      <Link
        to={item.path}
        onClick={onClick}
        className={cn(
          'nav-item',
          isActive(item.path) ? 'nav-item-active' : 'nav-item-inactive'
        )}
      >
        <item.icon className="h-5 w-5" />
        <span className="lowercase">{item.label}</span>
      </Link>
    );
  };

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={() => setIsMobileOpen(true)}
        className="fixed top-4 left-4 z-50 p-2 rounded-lg bg-card border border-border lg:hidden"
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Mobile Overlay */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed top-0 left-0 h-full bg-sidebar border-r border-sidebar-border z-50',
          'w-56 flex flex-col',
          'transition-transform duration-200 ease-out',
          'lg:translate-x-0',
          isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-sidebar-border">
          <Link to="/" className="flex items-center gap-2" onClick={() => setIsMobileOpen(false)}>
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <span className="font-bold text-primary-foreground text-sm">VS</span>
            </div>
            <span className="font-medium text-sm lowercase">voucherswap</span>
          </Link>
          
          {/* Mobile Close Button */}
          <button
            onClick={() => setIsMobileOpen(false)}
            className="p-1 rounded hover:bg-sidebar-accent lg:hidden"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Primary Navigation */}
        <nav className="flex-1 p-3 space-y-1">
          {primaryNav.map((item) => (
            <NavLink key={item.path} item={item} onClick={() => setIsMobileOpen(false)} />
          ))}
          
          <div className="h-px bg-sidebar-border my-4" />
          
          {secondaryNav.map((item) => (
            <NavLink key={item.path} item={item} onClick={() => setIsMobileOpen(false)} />
          ))}
        </nav>

        {/* User Section */}
        <div className="p-3 border-t border-sidebar-border">
          {isAuthenticated ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2 px-3 py-2">
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                  <User className="h-4 w-4 text-primary" />
                </div>
                <span className="text-sm text-muted-foreground truncate lowercase">
                  {user?.username || 'user'}
                </span>
              </div>
              <button
                onClick={handleLogout}
                className="nav-item nav-item-inactive w-full text-left"
              >
                <LogOut className="h-5 w-5" />
                <span className="lowercase">log out</span>
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <Button
                variant="ghost"
                className="w-full justify-start lowercase"
                onClick={openLogin}
              >
                log in
              </Button>
              <Button
                className="w-full lowercase"
                onClick={openSignup}
              >
                sign up
              </Button>
            </div>
          )}
        </div>
      </aside>

      {/* Auth Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        initialMode={authMode}
      />
    </>
  );
}

