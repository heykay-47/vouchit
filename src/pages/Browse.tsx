import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  useLocation,
  useNavigationType,
  useSearchParams,
} from 'react-router-dom';
import {
  CampaignOfferCard,
  CampaignOfferDialog,
  type OpenCampaignOffer,
} from '@/components/CampaignOfferCard';
import { OfferFilters } from '@/components/OfferFilters';
import { Button } from '@/components/ui/button';
import VoucherCard from '@/components/VoucherCard';
import VoucherSkeleton from '@/components/VoucherSkeleton';
import {
  flattenOfferPages,
  useOffersQuery,
} from '@/hooks/useOffersQuery';
import {
  hasActiveOfferFilters,
  parseOfferFilters,
  writeOfferFilters,
} from '@/lib/offer-filters';
import type { CampaignOffer, OfferFilters as OfferFilterState } from '@/lib/types';

const INITIAL_SKELETON_COUNT = 6;

function readCssDuration(name: string, fallback: number) {
  const rawValue = getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim();
  const value = Number.parseFloat(rawValue);

  if (!Number.isFinite(value)) return fallback;
  return rawValue.endsWith('s') && !rawValue.endsWith('ms') ? value * 1000 : value;
}

function AnimatedButtonLabel({ text }: { text: string }) {
  const labelRef = useRef<HTMLSpanElement>(null);
  const [renderedText, setRenderedText] = useState(text);
  const [phase, setPhase] = useState<'idle' | 'exit' | 'enter'>('idle');

  useEffect(() => {
    if (text === renderedText) return;

    const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reducedMotion) {
      setRenderedText(text);
      setPhase('idle');
      return;
    }

    setPhase('exit');
    const timeout = window.setTimeout(() => {
      setRenderedText(text);
      setPhase('enter');

      window.requestAnimationFrame(() => {
        if (labelRef.current) void labelRef.current.offsetHeight;
        setPhase('idle');
      });
    }, readCssDuration('--text-swap-dur', 150));

    return () => window.clearTimeout(timeout);
  }, [renderedText, text]);

  return (
    <span
      ref={labelRef}
      data-testid="load-more-label"
      aria-hidden="true"
      className={`t-text-swap${phase === 'exit' ? ' is-exit' : ''}${phase === 'enter' ? ' is-enter-start' : ''}`}
    >
      {renderedText}
    </span>
  );
}

export default function Browse() {
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const navigationType = useNavigationType();
  const previousLocationKey = useRef(location.key);
  const [filterNavigationVersion, setFilterNavigationVersion] = useState(0);
  const [selected, setSelected] = useState<{
    offer: CampaignOffer;
    trigger: HTMLButtonElement;
  } | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [initialOffersRevealed, setInitialOffersRevealed] = useState(true);
  const resultsStatusRef = useRef<HTMLParagraphElement>(null);
  const filters = parseOfferFilters(searchParams);
  const query = useOffersQuery(filters);
  const offers = flattenOfferPages(query.data?.pages ?? []);
  const total = query.data?.pages[0]?.total ?? 0;
  const firstPageError = query.isError && !query.data;

  useEffect(() => {
    if (query.isPending) {
      setInitialOffersRevealed(false);
      return;
    }

    const frame = window.requestAnimationFrame(() => setInitialOffersRevealed(true));
    return () => window.cancelAnimationFrame(frame);
  }, [query.isPending]);

  useLayoutEffect(() => {
    const locationChanged = previousLocationKey.current !== location.key;
    previousLocationKey.current = location.key;

    if (locationChanged && navigationType === 'POP') {
      setFilterNavigationVersion((version) => version + 1);
    }
  }, [location.key, navigationType]);

  const updateFilters = (
    next: OfferFilterState,
    options: { replace: boolean },
  ) => {
    setSearchParams(writeOfferFilters(searchParams, next), {
      replace: options.replace,
    });
  };

  const openCampaign: OpenCampaignOffer = (offer, trigger) => {
    setSelected({ offer, trigger });
    setDialogOpen(true);
  };

  return (
    <div className="py-4">
      <header className="mb-8">
        <h1 className="mb-2 text-2xl font-medium lowercase">browse vouchers</h1>
        <p
          ref={resultsStatusRef}
          role="status"
          aria-live="polite"
          aria-atomic="true"
          tabIndex={-1}
          className="text-sm text-muted-foreground"
        >
          {total} offers found
        </p>
      </header>

      <div className="mb-8">
        <OfferFilters
          key={filterNavigationVersion}
          filters={filters}
          onChange={updateFilters}
        />
      </div>

      {query.isPending && (
        <p role="status" className="sr-only">loading offers</p>
      )}

      {firstPageError && (
        <div role="alert" className="py-16 text-center">
          <Button type="button" className="min-h-11 lowercase" onClick={() => query.refetch()}>
            retry loading offers
          </Button>
        </div>
      )}

      {(query.isPending || offers.length > 0) && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {(query.isPending
            ? Array.from({ length: INITIAL_SKELETON_COUNT }, () => null)
            : offers
          ).map((offer, index) => {
            const isRevealed = offer !== null
              && (index >= INITIAL_SKELETON_COUNT || initialOffersRevealed);

            return (
              <div
                key={`offer-slot-${index}`}
                className={`t-skel browse-offer-swap${isRevealed ? ' is-revealed' : ''}`}
              >
                <div
                  aria-hidden="true"
                  data-testid="offer-loading-placeholder"
                  className="t-skel-skeleton is-pulsing"
                >
                  <VoucherSkeleton />
                </div>
                <div className="t-skel-content">
                  {offer?.kind === 'community' ? (
                    <VoucherCard
                      key={`${offer.kind}:${offer.id}`}
                      voucher={offer}
                    />
                  ) : offer?.kind === 'campaign' ? (
                    <CampaignOfferCard
                      key={`${offer.kind}:${offer.id}`}
                      offer={offer}
                      onOpen={openCampaign}
                    />
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {!query.isPending && !firstPageError && total === 0 && (
        <div className="py-16 text-center">
          <p role="status" className="text-muted-foreground">
            {hasActiveOfferFilters(filters)
              ? 'no offers match these filters'
              : 'no offers are available right now'}
          </p>
        </div>
      )}

      {query.isFetchNextPageError && (
        <div role="alert" className="pt-8 text-center">
          <Button
            type="button"
            variant="outline"
            className="min-h-11 lowercase"
            onClick={() => query.fetchNextPage()}
          >
            retry loading more offers
          </Button>
        </div>
      )}

      {query.hasNextPage && !query.isFetchNextPageError && (
        <div
          role={query.isFetchingNextPage ? 'status' : undefined}
          aria-live="polite"
          aria-atomic="true"
          className="pt-8 text-center"
        >
          <Button
            type="button"
            variant="outline"
            className="min-h-11 lowercase"
            aria-label={query.isFetchingNextPage ? 'loading more...' : 'load more offers'}
            disabled={query.isFetchingNextPage}
            onClick={() => query.fetchNextPage()}
          >
            <AnimatedButtonLabel
              text={query.isFetchingNextPage ? 'loading more...' : 'load more offers'}
            />
          </Button>
        </div>
      )}

      {selected && (
        <CampaignOfferDialog
          offer={selected.offer}
          open={dialogOpen}
          trigger={selected.trigger}
          focusFallback={resultsStatusRef.current}
          onOpenChange={setDialogOpen}
        />
      )}
    </div>
  );
}
