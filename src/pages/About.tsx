export default function About() {
  return (
    <div className="max-w-2xl">
      <header className="mb-8">
        <h1 className="text-2xl font-medium lowercase mb-2">about voucherswap</h1>
        <p className="text-muted-foreground">
          a community platform for sharing unused vouchers
        </p>
      </header>

      <div className="space-y-8">
        <section>
          <h2 className="text-lg font-medium lowercase mb-3">what is this?</h2>
          <p className="text-muted-foreground leading-relaxed">
            voucherswap helps you share unused vouchers from google pay, paytm, phonepe 
            and other platforms with people who can actually use them. instead of letting 
            vouchers expire, donate them to the community.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-medium lowercase mb-3">how it works</h2>
          <ul className="space-y-3 text-muted-foreground">
            <li className="flex items-start gap-3">
              <span className="text-primary">1.</span>
              <span>browse available vouchers or donate your unused ones</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-primary">2.</span>
              <span>grab vouchers you can use before they expire</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-primary">3.</span>
              <span>report invalid vouchers to keep the platform clean</span>
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-medium lowercase mb-3">community driven</h2>
          <p className="text-muted-foreground leading-relaxed">
            this platform is built for the community, by the community. no ads, 
            no tracking, no monetization. just people helping people save money.
          </p>
        </section>
      </div>
    </div>
  );
}

