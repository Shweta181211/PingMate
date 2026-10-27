import Link from "next/link";

const steps = [["01", "Reads the signal", "Finds opportunity emails amid the noise."], ["02", "Makes it actionable", "Pulls the deadline, link, and next step."], ["03", "Stays on it", "Creates reminders before the moment passes."]];

export default async function LandingPage() {
  return <main className="pm-page">
    <nav className="pm-nav">
      <Link href="/" className="pm-brand"><span>p</span>pingmate</Link>
      <div className="pm-nav-links"><a href="#flow">How it works</a><a href="#why">Why PingMate</a></div>
      <Link href="/auth/signin" className="pm-nav-cta">Connect Gmail <b>↗</b></Link>
    </nav>
    <section className="pm-hero">
      <div className="pm-hero-copy">
        <p className="pm-eyebrow"><i /> INBOX INTELLIGENCE FOR STUDENTS</p>
        <h1>Make your inbox<br /><em>show up</em> for you.</h1>
        <p className="pm-intro">Opportunities don&apos;t belong in a pile of unread mail. PingMate turns the important ones into a simple plan you can actually follow.</p>
        <div className="pm-actions"><Link href="/auth/signin" className="pm-primary">Connect Gmail <span>→</span></Link><a href="#flow" className="pm-text-link">Take the tour <span>↓</span></a></div>
        <p className="pm-note">Read-only Gmail access · You stay in control</p>
      </div>
      <div className="pm-inbox-scene" aria-label="An animated representation of PingMate organizing inbox opportunities">
        <div className="pm-sun" /><div className="pm-dot-grid" />
        <div className="pm-email pm-email-one"><small>NEW IN YOUR INBOX</small><strong>Google — SWE Intern</strong><p>Applications close this Friday</p><b>2h ago</b></div>
        <div className="pm-email pm-email-two"><span className="pm-mini-icon">✦</span><small>PINGMATE FOUND</small><strong>Deadline: Friday, 11:59 PM</strong><p>Application link saved</p></div>
        <div className="pm-email pm-email-three"><small>REMINDER READY</small><strong>Tomorrow · 9:00 AM</strong><p><i /> You&apos;ve got this</p></div>
        <div className="pm-path"><span /><span /><span /></div><div className="pm-orb">PM</div>
        <p className="pm-scene-caption">FROM INBOX CHAOS <b>TO CLEAR NEXT STEPS</b></p>
      </div>
    </section>
    <section id="flow" className="pm-flow">
      <div className="pm-flow-heading"><p className="pm-eyebrow"><i /> THE PINGMATE WAY</p><h2>Less searching.<br />More <em>showing up.</em></h2></div>
      <div className="pm-step-list">{steps.map(([number, title, copy]) => <article key={number} className="pm-step"><span>{number}</span><div><h3>{title}</h3><p>{copy}</p></div><b>↗</b></article>)}</div>
    </section>
    <section id="why" className="pm-closing"><p>YOUR NEXT OPPORTUNITY IS ALREADY IN YOUR INBOX.</p><h2>Don&apos;t make it<br /><em>your next regret.</em></h2><Link href="/auth/signin" className="pm-primary">Start with Gmail <span>→</span></Link></section>
  </main>;
}
