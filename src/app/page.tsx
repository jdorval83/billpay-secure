import Link from "next/link";

export default function Home() {
  return (
    <main>
      <section className="hero">
        <div className="hero-grid" />
        <div className="hero-content">
          <p className="hero-label">Billing for service businesses</p>
          <h1 className="hero-title">
            Get paid
            <br />
            <span>faster.</span>
          </h1>
          <p className="hero-desc">
            Add customers, create bills, send Stripe payment links. Simple, secure, no fuss.
          </p>
          <div className="hero-buttons">
            <Link href="/dashboard" className="btn-primary">Go to Dashboard</Link>
            <Link href="/company" className="btn-secondary">About</Link>
          </div>
        </div>
      </section>

      <section className="section section-white">
        <div className="container">
          <h2 className="section-title">How it works</h2>
          <p className="section-desc">Three steps to get paid. No complexity, no hidden fees.</p>
          <div className="features">
            <div className="feature-card">
              <div className="feature-num">1</div>
              <h3 className="feature-title">Add customers</h3>
              <p className="feature-desc">Store name, email, and phone. One place for all your clients.</p>
            </div>
            <div className="feature-card">
              <div className="feature-num">2</div>
              <h3 className="feature-title">Create bills</h3>
              <p className="feature-desc">Invoice in seconds. Amount, due date, description—done.</p>
            </div>
            <div className="feature-card">
              <div className="feature-num">3</div>
              <h3 className="feature-title">Send & get paid</h3>
              <p className="feature-desc">One-click Stripe link. Copy, send, collect. Bills auto-mark paid.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="section section-gray">
        <div className="cta">
          <h2 className="cta-title">Ready to get started?</h2>
          <p className="cta-desc">No credit card required. Add your first customer in under a minute.</p>
          <Link href="/dashboard" className="btn-primary">Open Dashboard</Link>
        </div>
      </section>

      <footer className="footer">
        <div className="footer-inner">
          <span className="footer-brand">BillPay Secure</span>
          <div className="footer-links">
            <Link href="/dashboard">Dashboard</Link>
            <Link href="/company">About</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
