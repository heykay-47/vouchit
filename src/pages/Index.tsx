import type { MouseEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useAuthDialog } from '@/contexts/AuthDialogContext';
import LandingNav from '@/components/landing/LandingNav';
import ExchangeBoard from '@/components/landing/ExchangeBoard';

export default function Index() {
  const { isAuthenticated } = useAuth();
  const { openLogin } = useAuthDialog();
  const navigate = useNavigate();

  const handleDonate = (event: MouseEvent<HTMLButtonElement>) => {
    if (isAuthenticated) {
      navigate('/donate');
      return;
    }

    openLogin(event.currentTarget, () => navigate('/donate'));
  };

  return (
    <main aria-label="vouchit landing" className="landing-page">
      <LandingNav />
      <div className="landing-frame landing-page__body">
        <section className="landing-hero" aria-labelledby="landing-title">
          <div className="landing-hero__copy">
            <h1 id="landing-title">good vouchers shouldn't go unused.</h1>
            <p>
              pass on what you cannot use. find something useful before it expires.
            </p>
            <div className="landing-hero__actions">
              <Link className="landing-action landing-action--primary" to="/browse">browse vouchers</Link>
              <Button type="button" variant="outline" className="landing-action" onClick={handleDonate}>
                donate yours
              </Button>
            </div>
          </div>
          <p className="landing-hero__note">a simple exchange between people, not another promotions feed.</p>
        </section>

        <ExchangeBoard />
      </div>
    </main>
  );
}
