import type { MouseEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useAuthDialog } from '@/contexts/AuthDialogContext';
import { useVouchers } from '@/contexts/VoucherContext';
import type { Voucher } from '@/lib/types';
import LandingNav from '@/components/landing/LandingNav';
import ExchangeBoard from '@/components/landing/ExchangeBoard';
import ExchangeWalkthrough from '@/components/landing/ExchangeWalkthrough';
import TrustStrip from '@/components/landing/TrustStrip';

export function getAvailableVoucherCount(vouchers: Voucher[], now = new Date()) {
  return vouchers.filter((voucher) => (
    voucher.isActive &&
    !voucher.isRedeemed &&
    (!voucher.expiryDate || new Date(voucher.expiryDate) >= now)
  )).length;
}

export default function Index() {
  const { isAuthenticated } = useAuth();
  const { openLogin } = useAuthDialog();
  const { vouchers, isLoading, loadError } = useVouchers();
  const navigate = useNavigate();
  const availableVoucherCount = getAvailableVoucherCount(vouchers);

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
        <ExchangeWalkthrough />
        <TrustStrip />

        <section className="landing-closing" aria-labelledby="landing-closing-title">
          <div>
            <h2 id="landing-closing-title">find the next useful voucher.</h2>
            <p>browse what people have shared, then claim only when it fits.</p>
          </div>
          {!isLoading && !loadError && availableVoucherCount > 0 && (
            <p className="landing-closing__availability" role="status">
              {availableVoucherCount} voucher{availableVoucherCount === 1 ? '' : 's'} available right now
            </p>
          )}
          <Link className="landing-action landing-action--primary" to="/browse">browse vouchers</Link>
        </section>
      </div>
      <footer className="landing-footer" data-layout="responsive">
        <div className="landing-frame landing-footer__inner">
          <span>vouchit, passed on by people.</span>
          <nav aria-label="footer navigation" className="landing-footer__links">
            <Link to="/browse">browse</Link>
            <Link to="/community">community</Link>
            <Link to="/about">about</Link>
            <a href="https://github.com/heykay-47/vouchit.git" aria-label="vouchit repository">repository</a>
          </nav>
        </div>
      </footer>
    </main>
  );
}
