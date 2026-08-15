import { motion, useReducedMotion } from 'framer-motion';
import { Ticket } from 'lucide-react';

const exchangeStages = [
  { id: 'donated', label: 'donated', detail: 'shared by a community member' },
  { id: 'available', label: 'available', detail: 'ready for someone who can use it' },
  { id: 'claimed', label: 'claimed', detail: 'passed on before expiry' },
] as const;

export default function ExchangeBoard() {
  const reducedMotion = useReducedMotion() ?? false;

  return (
    <section id="exchange-board" aria-labelledby="exchange-board-title" className="exchange-board">
      <h2 id="exchange-board-title" className="sr-only">
        how a voucher moves through vouchit
      </h2>
      <div className="exchange-board__canvas">
        <div className="exchange-board__path" aria-hidden="true" />
        <motion.div
          aria-hidden="true"
          className="exchange-board__connector"
          data-testid="exchange-connector"
          data-motion-state={reducedMotion ? 'reduced' : 'staged'}
          initial={reducedMotion ? false : { scale: 0 }}
          animate={{ scale: 1 }}
          transition={reducedMotion ? { duration: 0 } : { delay: 0.35, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        />
        <motion.div
          aria-hidden="true"
          className="exchange-board__marker"
          data-testid="exchange-marker"
          data-motion-state={reducedMotion ? 'reduced' : 'staged'}
          initial={reducedMotion ? false : { x: -20 }}
          animate={{ x: 0 }}
          transition={reducedMotion ? { duration: 0 } : { delay: 0.2, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        >
          <Ticket aria-hidden="true" />
        </motion.div>

        <ol className="exchange-board__stages">
          {exchangeStages.map((stage) => (
            <li key={stage.id} className="exchange-board__stage" data-state="active">
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
    </section>
  );
}
