import Link from "next/link";
import { ENVIRONMENTS } from "@/lib/environments";

export default function HomePage() {
  return (
    <>
      <section className="hero" aria-label="Sovereign Content">
        <div className="hero-plane" aria-hidden="true" />
        <h1 className="hero-brand">Sovereign Content</h1>
        <p className="hero-lead">
          The single source of truth for autonomous catalogue improvement — transfer the system,
          not the listings.
        </p>
        <div className="cta-row">
          <a className="btn btn-primary" href="#environments">
            Choose environment
          </a>
          <Link className="btn btn-ghost" href="/doctrine">
            Read doctrine
          </Link>
        </div>
      </section>

      <section className="section" id="environments" aria-labelledby="env-heading">
        <h2 id="env-heading">Where to build</h2>
        <p className="lede">
          Pick the runtime that will run the jobs. Cursor is the proven first environment; others
          are stubs until their playbooks land.
        </p>
        <div className="env-grid">
          {ENVIRONMENTS.map((env) =>
            env.state === "ready" ? (
              <Link
                key={env.id}
                className="env-card"
                href={env.href}
                data-state={env.state}
              >
                <span className="status">{env.status}</span>
                <h3>{env.name}</h3>
                <p>{env.summary}</p>
                <span className="go">{env.cta} →</span>
              </Link>
            ) : (
              <div key={env.id} className="env-card" data-state={env.state} aria-disabled="true">
                <span className="status">{env.status}</span>
                <h3>{env.name}</h3>
                <p>{env.summary}</p>
                <span className="go">{env.cta}</span>
              </div>
            ),
          )}
        </div>
      </section>
    </>
  );
}
