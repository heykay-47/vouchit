import { useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Ticket } from 'lucide-react';

const exchangeStages = [
  { id: 'donated', label: 'donated', detail: 'shared by a community member' },
  { id: 'available', label: 'available', detail: 'ready for someone who can use it' },
  { id: 'claimed', label: 'claimed', detail: 'passed on before expiry' },
] as const;

const desktopBreakpoint = '(min-width: 768px)';

function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(() => (
    typeof window !== 'undefined' && typeof window.matchMedia === 'function'
      ? window.matchMedia(query).matches
      : false
  ));

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;

    const mediaQuery = window.matchMedia(query);
    const handleChange = () => setMatches(mediaQuery.matches);
    handleChange();
    mediaQuery.addEventListener('change', handleChange);

    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [query]);

  return matches;
}

export default function ExchangeBoard() {
  const reducedMotion = useReducedMotion() ?? false;
  const isDesktop = useMediaQuery(desktopBreakpoint);
  const motionStages = exchangeStages.map((stage) => stage.id).join(' ');
  const markerAnimation = reducedMotion
    ? isDesktop
      ? { left: 'calc(66.666% + 16px)', top: '8px' }
      : { left: '16px', top: 'calc(66.666% + 8px)' }
    : isDesktop
      ? {
          left: ['16px', 'calc(33.333% + 16px)', 'calc(66.666% + 16px)'],
          top: '8px',
        }
      : {
          left: '16px',
          top: ['8px', 'calc(33.333% + 8px)', 'calc(66.666% + 8px)'],
        };

  return (
    <section
      id="exchange-board"
      aria-labelledby="exchange-board-title"
      className="exchange-board exchange-board--first-viewport"
      data-first-viewport="true"
    >
      <h2 id="exchange-board-title" className="sr-only">
        how a voucher moves through vouchit
      </h2>
      <div className="exchange-board__canvas">
        <div className="exchange-board__track" data-testid="exchange-track">
          <div className="exchange-board__path" aria-hidden="true" />
          <motion.div
            aria-hidden="true"
            className="exchange-board__connector"
            data-testid="exchange-connector"
            data-motion-axis={isDesktop ? 'horizontal' : 'vertical'}
            data-motion-state={reducedMotion ? 'reduced' : 'staged'}
            initial={reducedMotion ? false : { scale: 0 }}
            animate={{ scale: 1 }}
            transition={reducedMotion ? { duration: 0 } : { delay: 0.35, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          />
          <motion.div
            aria-hidden="true"
            className="exchange-board__marker"
            data-testid="exchange-marker"
            data-motion-axis={isDesktop ? 'horizontal' : 'vertical'}
            data-motion-stages={motionStages}
            data-motion-state={reducedMotion ? 'reduced' : 'staged'}
            initial={reducedMotion ? false : { left: '16px', top: '8px' }}
            animate={markerAnimation}
            transition={reducedMotion ? { duration: 0 } : { delay: 0.2, duration: 1.8, times: [0, 0.5, 1], ease: [0.22, 1, 0.36, 1] }}
          >
            <Ticket aria-hidden="true" />
          </motion.div>

          <ol className="exchange-board__stages">
            {exchangeStages.map((stage) => (
              <li key={stage.id} className="exchange-board__stage" data-stage={stage.id} data-state="active">
                <span className={`exchange-board__node exchange-board__node--${stage.id}`} aria-hidden="true" />
                <div>
                  <h3>{stage.label}</h3>
                  <p>{stage.detail}</p>
                  {stage.id === 'claimed' && <span className="exchange-board__expiry">before expiry</span>}
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
