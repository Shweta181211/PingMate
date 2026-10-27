"use client";

import { signIn } from "next-auth/react";
import Link from "next/link";
import { useEffect, useState } from "react";

export default function SignInPage() {
  const [loading, setLoading] = useState(false);
  const [connectionError, setConnectionError] = useState(false);
  const [reconnect, setReconnect] = useState(false);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setConnectionError(params.has("error"));
    setReconnect(params.get("reconnect") === "1");
  }, []);
  return <main className="pm-auth-page">
    <Link href="/" className="pm-brand"><span>p</span>pingmate</Link>
    <section className="pm-auth-card">
      <p className="pm-eyebrow"><i /> WELCOME TO PINGMATE</p>
      <h1>Let&apos;s find what<br /><em>matters.</em></h1>
      <p>Connect your Gmail once. PingMate only reads emails to identify opportunities and deadlines—you remain in control.</p>
      {connectionError && <div className="pm-error-note"><strong>Connection could not finish.</strong> Please try Google again. If it still fails, make sure your Google OAuth callback URL is <code>http://localhost:3000/api/auth/callback/google</code>.</div>}
      <button onClick={async () => {
        setLoading(true);
        // A returning user can arrive with a revoked Google refresh token.
        // Resetting just their Google account record makes this consent flow
        // write fresh Gmail tokens; a first-time visitor simply gets a 401
        // here and continues normally.
        if (reconnect) await fetch("/api/gmail/reconnect", { method: "POST" });
        await signIn("google", { callbackUrl: "/dashboard" });
      }} disabled={loading} className="pm-google">
        <span className="pm-google-mark">G</span>{loading ? "Opening Google…" : reconnect ? "Reconnect Gmail" : "Continue with Google"}<b>→</b>
      </button>
      <div className="pm-auth-trust"><span>◌ Read-only access</span><span>◌ No spam</span><span>◌ Disconnect anytime</span></div>
    </section>
    <aside className="pm-auth-aside"><p>INBOX → INTENT → ACTION</p><div className="pm-auth-stamp">PM</div><h2>One less thing<br />to remember.</h2></aside>
  </main>;
}
