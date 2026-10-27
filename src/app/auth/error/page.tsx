import Link from "next/link";

export default function AuthErrorPage({ searchParams }: { searchParams: { error?: string } }) {
  const error = searchParams.error;
  const databaseIssue = error === "Configuration" || error === "AdapterError";
  return <main className="pm-auth-page">
    <Link href="/" className="pm-brand"><span>p</span>pingmate</Link>
    <section className="pm-auth-card">
      <p className="pm-eyebrow"><i /> CONNECTION NEEDS ATTENTION</p>
      <h1>Almost<br /><em>there.</em></h1>
      <p>{databaseIssue ? "Google access was approved, but PingMate could not save your secure session because the configured Supabase database is unavailable." : "PingMate could not finish the Google connection. Please try once more."}</p>
      {databaseIssue && <div className="pm-error-note"><strong>Required action:</strong> Reactivate the PingMate Supabase project, then keep its current connection string in <code>DATABASE_URL</code> inside <code>.env</code>.</div>}
      <Link href="/auth/signin" className="pm-primary">Try Google again <span>→</span></Link>
    </section>
    <aside className="pm-auth-aside"><p>SECURE CONNECTION</p><div className="pm-auth-stamp">!</div><h2>We&apos;ll keep your<br />data in context.</h2></aside>
  </main>;
}
