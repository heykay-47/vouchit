import { useEffect, useRef, useState } from 'react';
import { Menu, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuthDialog } from '@/contexts/AuthDialogContext';

export default function LandingNav() {
  const { openLogin } = useAuthDialog();
  const [mobileOpen, setMobileOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!mobileOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setMobileOpen(false);
      menuButtonRef.current?.focus();
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [mobileOpen]);

  const closeMobileNavigation = () => setMobileOpen(false);

  return (
    <header className="landing-nav">
      <div className="landing-frame landing-nav__inner">
        <Link className="landing-nav__logo" to="/" aria-label="vouchit home">
          <img src="/logo/vouchitLogo.png" alt="vouchit" width="36" height="36" />
          <span>vouchit</span>
        </Link>

        <nav
          id="landing-navigation"
          aria-label="primary navigation"
          className={`landing-nav__links ${mobileOpen ? 'landing-nav__links--open' : ''}`}
        >
          <a className="hover:bg-muted hover:text-foreground" href="#exchange-board" onClick={closeMobileNavigation}>how it works</a>
          <Link className="hover:bg-muted hover:text-foreground" to="/community" onClick={closeMobileNavigation}>community</Link>
          <Link className="hover:bg-muted hover:text-foreground" to="/about" onClick={closeMobileNavigation}>about vouchit</Link>
          <Link className="hover:bg-muted hover:text-foreground" to="/browse" onClick={closeMobileNavigation}>browse</Link>
        </nav>

        <div className="landing-nav__actions">
          <Button
            type="button"
            variant="ghost"
            className="min-h-11 px-3 hover:bg-muted hover:text-foreground"
            onClick={(event) => {
              closeMobileNavigation();
              openLogin(event.currentTarget);
            }}
          >
            log in
          </Button>
          <button
            ref={menuButtonRef}
            type="button"
            aria-expanded={mobileOpen}
            aria-controls="landing-navigation"
            aria-label={mobileOpen ? 'close navigation' : 'open navigation'}
            className="inline-flex min-h-11 min-w-11 items-center justify-center md:hidden"
            onClick={() => setMobileOpen((open) => !open)}
          >
            {mobileOpen ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
          </button>
        </div>
      </div>
    </header>
  );
}
