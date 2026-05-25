import DonateVoucher from '@/components/DonateVoucher';

export default function Donate() {
  return (
    <div className="max-w-xl mx-auto">
      <header className="text-center mb-8">
        <h1 className="text-2xl font-medium lowercase mb-2">donate a voucher</h1>
        <p className="text-muted-foreground">
          share your unused vouchers with the community
        </p>
      </header>

      <DonateVoucher />
    </div>
  );
}

