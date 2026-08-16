import { useEffect, useRef, useState } from 'react';
import { motion, useInView, useReducedMotion } from 'framer-motion';
import { Ticket } from 'lucide-react';

const exchangeStages = [
  { id: 'donated', label: 'donated', detail: 'shared by a community member' },
  { id: 'available', label: 'available', detail: 'ready for someone who can use it' },
  { id: 'claimed', label: 'claimed', detail: 'reserved for its claimant' },
] as const;

const horizontalBoardBreakpoint = '(min-width: 560px)';
const stageDelay = 700;

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
  const boardRef = useRef<HTMLElement>(null);
  const reducedMotion = useReducedMotion() ?? false;
  const isInView = useInView(boardRef, { once: true, amount: 0.35 });
  const isHorizontal = useMediaQuery(horizontalBoardBreakpoint);
  const [activeStage, setActiveStage] = useState(0);
  const motionStages = exchangeStages.map((stage) => stage.id).join(' ');

  useEffect(() => {
    if (!isInView) return;

    if (reducedMotion) {
      setActiveStage(exchangeStages.length - 1);
      return;
    }

    setActiveStage(0);
    const availableTimer = window.setTimeout(() => setActiveStage(1), stageDelay);
    const claimedTimer = window.setTimeout(() => setActiveStage(2), stageDelay * 2);

    return () => {
      window.clearTimeout(availableTimer);
      window.clearTimeout(claimedTimer);
    };
  }, [isInView, reducedMotion]);

  const markerOffset = isHorizontal
    ? { x: `${activeStage * 33.333}%`, y: '0%' }
    : { x: '0%', y: `${activeStage * 33.333}%` };

  return (
    <section
      id="exchange-board"
      ref={boardRef}
      aria-labelledby="exchange-board-title"
      className="exchange-board exchange-board--first-viewport"
      data-first-viewport="true"
    >
      <h2 id="exchange-board-title" className="sr-only">
        how a voucher moves through vouchit
      </h2>
      <div className="exchange-board__canvas">
        <div
          className="exchange-board__track"
          data-testid="exchange-track"
          data-rail-side={isHorizontal ? 'inline-start' : 'inline-end'}
        >
          <div className="exchange-board__path" aria-hidden="true" />
          <motion.div
            aria-hidden="true"
            className="exchange-board__connector"
            data-testid="exchange-connector"
            data-motion-axis={isHorizontal ? 'horizontal' : 'vertical'}
            data-motion-state={reducedMotion ? 'reduced' : 'staged'}
            data-current-stage={exchangeStages[activeStage].id}
            initial={false}
            animate={{ scale: activeStage / (exchangeStages.length - 1) }}
            transition={reducedMotion ? { duration: 0 } : { duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          />
          <motion.div
            className="exchange-board__marker-motion"
            initial={false}
            animate={markerOffset}
            transition={reducedMotion ? { duration: 0 } : { duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          >
            <div
              aria-hidden="true"
              className="exchange-board__marker"
              data-testid="exchange-marker"
              data-motion-axis={isHorizontal ? 'horizontal' : 'vertical'}
              data-motion-stages={motionStages}
              data-motion-state={reducedMotion ? 'reduced' : 'staged'}
              data-current-stage={exchangeStages[activeStage].id}
            >
              <Ticket />
            </div>
          </motion.div>

          <ol className="exchange-board__stages">
            {exchangeStages.map((stage, index) => (
              <li
                key={stage.id}
                className="exchange-board__stage"
                data-stage={stage.id}
                data-state={index < activeStage ? 'reached' : index === activeStage ? 'current' : 'upcoming'}
              >
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
