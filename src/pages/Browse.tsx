import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import {
  CampaignOfferCard,
  CampaignOfferDialog,
  type OpenCampaignOffer,
} from '@/components/CampaignOfferCard';
import { OfferFilters } from '@/components/OfferFilters';
import { Button } from '@/components/ui/button';
import VoucherCard from '@/components/VoucherCard';
import {
  flattenOfferPages,
  offersQueryKey,
  useOffersQuery,
} from '@/hooks/useOffersQuery';
import {
  hasActiveOfferFilters,
  parseOfferFilters,
  writeOfferFilters,
} from '@/lib/offer-filters';
import type { CampaignOffer, OfferFilters as OfferFilterState } from '@/lib/types';

export default function Browse() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [selected, setSelected] = useState<{
    offer: CampaignOffer;
    trigger: HTMLButtonElement;
  } | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const queryClient = useQueryClient();
  const filters = parseOfferFilters(searchParams);
  const query = useOffersQuery(filters);
  const offers = flattenOfferPages(query.data?.pages ?? []);
  const total = query.data?.pages[0]?.total ?? 0;
  const firstPageError = query.isError && !query.data;

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

  const refreshOffers = () => {
    void queryClient.invalidateQueries({ queryKey: offersQueryKey });
  };

  return (
    <div className="py-4">
      <header className="mb-8">
        <h1 className="mb-2 text-2xl font-medium lowercase">browse vouchers</h1>
        <p className="text-sm text-muted-foreground">{total} offers found</p>
      </header>

      <div className="mb-8">
        <OfferFilters filters={filters} onChange={updateFilters} />
      </div>

      {query.isPending && (
        <div className="py-16 text-center">
          <p className="text-muted-foreground">loading...</p>
        </div>
      )}

      {firstPageError && (
        <div className="py-16 text-center">
          <Button type="button" className="min-h-11 lowercase" onClick={() => query.refetch()}>
            retry loading offers
          </Button>
        </div>
      )}

      {offers.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {offers.map((offer) => (
            offer.kind === 'community' ? (
              <VoucherCard
                key={`${offer.kind}:${offer.id}`}
                voucher={offer}
                onRedeemSuccess={refreshOffers}
              />
            ) : (
              <CampaignOfferCard
                key={`${offer.kind}:${offer.id}`}
                offer={offer}
                onOpen={openCampaign}
              />
            )
          ))}
        </div>
      )}

      {!query.isPending && !firstPageError && total === 0 && (
        <div className="py-16 text-center">
          <p className="text-muted-foreground">
            {hasActiveOfferFilters(filters)
              ? 'no offers match these filters'
              : 'no offers are available right now'}
          </p>
        </div>
      )}

      {query.isFetchNextPageError && (
        <div className="pt-8 text-center">
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
        <div className="pt-8 text-center">
          <Button
            type="button"
            variant="outline"
            className="min-h-11 lowercase"
            disabled={query.isFetchingNextPage}
            onClick={() => query.fetchNextPage()}
          >
            {query.isFetchingNextPage ? 'loading more...' : 'load more offers'}
          </Button>
        </div>
      )}

      {selected && (
        <CampaignOfferDialog
          offer={selected.offer}
          open={dialogOpen}
          trigger={selected.trigger}
          onOpenChange={setDialogOpen}
        />
      )}
    </div>
  );
}
