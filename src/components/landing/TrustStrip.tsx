import { Flag, LockKeyhole, ShieldCheck, UserRoundX } from 'lucide-react';

const trustFacts = [
  { icon: LockKeyhole, text: 'protected codes are shared only with the donor or person who claims them' },
  { icon: ShieldCheck, text: 'each voucher can have one claim' },
  { icon: UserRoundX, text: 'donors cannot claim their own voucher' },
  { icon: Flag, text: 'five reports deactivate a voucher' },
] as const;

export default function TrustStrip() {
  return (
    <section className="trust-strip" aria-labelledby="trust-strip-title">
      <div className="landing-section-heading">
        <h2 id="trust-strip-title">how exchange stays accountable</h2>
      </div>
      <ul className="trust-strip__facts">
        {trustFacts.map(({ icon: Icon, text }) => (
          <li key={text} className="trust-strip__fact">
            <Icon aria-hidden="true" className="trust-strip__icon" />
            <p>{text}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
