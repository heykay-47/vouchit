import { useEffect, useRef, useState } from 'react';
import { motion, useInView, useReducedMotion } from 'framer-motion';

const steps = [
  ['01', 'donate', "sign in to share a wallet voucher you won't use"],
  ['02', 'discover', 'browse active vouchers without an account'],
  ['03', 'claim', 'sign in, claim once, and receive the protected details'],
] as const;

const stepDelay = 700;

export default function ExchangeWalkthrough() {
  const geometryRef = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion() ?? false;
  const isInView = useInView(geometryRef, { once: true, amount: 0.3 });
  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => {
    if (!isInView) return;

    setActiveStep(0);
    const discoverTimer = window.setTimeout(() => setActiveStep(1), stepDelay);
    const claimTimer = window.setTimeout(() => setActiveStep(2), stepDelay * 2);

    return () => {
      window.clearTimeout(discoverTimer);
      window.clearTimeout(claimTimer);
    };
  }, [isInView]);

  return (
    <section className="exchange-walkthrough" aria-labelledby="exchange-walkthrough-title">
      <div className="landing-section-heading">
        <h2 id="exchange-walkthrough-title">how to exchange a voucher</h2>
        <p>browsing is public; donating and claiming require authentication.</p>
      </div>
      <div className="exchange-walkthrough__track">
        <div
          className="exchange-walkthrough__geometry"
          ref={geometryRef}
          data-testid="exchange-walkthrough-geometry"
          data-path-geometry="stage-centers"
          data-motion-sequence="donate discover claim"
        >
          <div
            aria-hidden="true"
            className="exchange-walkthrough__path"
            data-testid="exchange-walkthrough-path"
          />
          <motion.div
            aria-hidden="true"
            className="exchange-walkthrough__progress"
            initial={false}
            animate={{ scale: activeStep / (steps.length - 1) }}
            transition={reducedMotion ? { duration: 0 } : { duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
            data-current-step={steps[activeStep][1]}
            data-motion-state={reducedMotion ? 'reduced' : 'staged'}
            data-testid="exchange-walkthrough-progress"
          />
          <ol className="exchange-walkthrough__steps" aria-label="vouchit exchange steps">
            {steps.map(([number, label, description], index) => (
              <li
                key={label}
                className="exchange-walkthrough__step"
                data-state={index < activeStep ? 'reached' : index === activeStep ? 'current' : 'upcoming'}
              >
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
