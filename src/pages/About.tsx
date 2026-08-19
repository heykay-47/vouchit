export default function About() {
  return (
    <div className="max-w-2xl">
      <header className="mb-8">
        <h1 className="text-2xl font-medium lowercase mb-2">about vouchit</h1>
        <p className="text-muted-foreground">
          a community platform for sharing unused vouchers
        </p>
      </header>

      <div className="space-y-8">
        <section>
          <h2 className="text-lg font-medium lowercase mb-3">what is this?</h2>
          <p className="text-muted-foreground leading-relaxed">
            vouchit is a prototype for vouchers shared by community members and business campaigns.
            community members can pass on unused vouchers, while businesses can publish campaign
            inventory for people who can use it before expiry.
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
            the prototype records community voucher sharing and business campaign activity in one
            ledger. external settlement is recorded before a business campaign publishes, and
            observed campaign views and claims are shown only when available.
          </p>
        </section>
      </div>
    </div>
  );
}

