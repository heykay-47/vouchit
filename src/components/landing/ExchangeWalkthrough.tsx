import { motion, useReducedMotion } from 'framer-motion';

const steps = [
  ['01', 'donate', "sign in to share a wallet voucher you won't use"],
  ['02', 'discover', 'browse active vouchers without an account'],
  ['03', 'claim', 'sign in, claim once, and receive the protected details'],
] as const;

export default function ExchangeWalkthrough() {
  const reducedMotion = useReducedMotion() ?? false;

  return (
    <section className="exchange-walkthrough" aria-labelledby="exchange-walkthrough-title">
      <div className="landing-section-heading">
        <h2 id="exchange-walkthrough-title">how to exchange a voucher</h2>
        <p>browsing is public; donating and claiming require authentication.</p>
      </div>
      <div className="exchange-walkthrough__track">
        <div
          className="exchange-walkthrough__geometry"
          data-testid="exchange-walkthrough-geometry"
          data-path-geometry="stage-centers"
        >
          <div
            aria-hidden="true"
            className="exchange-walkthrough__path"
            data-testid="exchange-walkthrough-path"
          />
          <motion.div
            aria-hidden="true"
            className="exchange-walkthrough__progress"
            initial={reducedMotion ? false : { scale: 0 }}
            whileInView={reducedMotion ? undefined : { scale: 1 }}
            viewport={{ once: true, amount: 0.35 }}
            data-motion-state={reducedMotion ? 'reduced' : 'staged'}
            data-testid="exchange-walkthrough-progress"
          />
          <ol className="exchange-walkthrough__steps" aria-label="vouchit exchange steps">
            {steps.map(([number, label, description]) => (
              <li key={label} className="exchange-walkthrough__step">
                <span className="exchange-walkthrough__number" aria-hidden="true">{number}</span>
                <div>
                  <h3>{label}</h3>
                  <p>{description}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
