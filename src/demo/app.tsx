import { Workspace } from './workspace';
const repo = 'https://github.com/anishmanthena123/Real-Estate-Listing-Maker';
export function App() {
  return (
    <>
      <header className="site-header">
        <a className="logo" href="#">
          <img src="./assets/mark.svg" alt="" />
          listly<span>AI</span>
        </a>
        <nav aria-label="Main navigation">
          <a href="#workspace">Interactive demo</a>
          <a href="#engineering">Behind the build</a>
          <a
            className="source-link"
            href={repo}
            target="_blank"
            rel="noreferrer"
          >
            View source →
          </a>
        </nav>
      </header>
      <main>
        <section className="hero">
          <div className="hero-copy">
            <p className="eyebrow">
              <span className="live-dot" /> INTERACTIVE PORTFOLIO DEMO
            </p>
            <h1>
              Beautiful property stories.
              <br />
              <em>Built on real evidence.</em>
            </h1>
            <p className="hero-description">
              AI can write a great listing. It can also invent a pool. Listly
              puts verified property facts at the center—and makes unsupported
              claims visible before you publish.
            </p>
            <div className="hero-actions">
              <a className="primary button" href="#workspace">
                Explore the workspace <span>→</span>
              </a>
              <a href="#engineering" className="quiet-link">
                See how it works ↓
              </a>
            </div>
            <div className="hero-note">
              <span>✓ No sign-in</span>
              <span>✓ No API key</span>
              <span>✓ Fictional sample data</span>
            </div>
          </div>
          <div className="hero-visual">
            <div className="visual-top">
              <span className="pill">A MORE THOUGHTFUL WAY TO WRITE</span>
              <span className="visual-mark">→</span>
            </div>
            <img
              src="./assets/home.svg"
              alt="Stylized illustration of a home, not an actual property photograph"
            />
            <div className="evidence-float">
              <div className="check-icon">✓</div>
              <div>
                <strong>Evidence first. Words second.</strong>
                <span>Verify features before they become facts.</span>
              </div>
            </div>
            <span className="illustration-caption">
              Original illustration · not a real listing
            </span>
          </div>
        </section>
        <div className="trust-strip">
          <span>STRUCTURED FACTS</span>
          <i>→</i>
          <span>AGENT VERIFICATION</span>
          <i>→</i>
          <span>GROUNDED DRAFTS</span>
          <i>→</i>
          <span>HUMAN REVIEW</span>
        </div>
        <Workspace />
        <section className="engineering" id="engineering">
          <div>
            <p className="eyebrow">THE ENGINEERING BEHIND THE EXPERIENCE</p>
            <h2>
              The difficult part isn’t writing.
              <br />
              It’s knowing what’s supported.
            </h2>
            <p className="section-description">
              This demo shares its evidence projection and conservative claim
              validator with the full-stack application in this repository.
            </p>
            <a
              className="quiet-link"
              href={`${repo}/blob/main/docs/ARCHITECTURE.md`}
              target="_blank"
              rel="noreferrer"
            >
              Read the architecture →
            </a>
          </div>
          <div className="engineering-grid">
            <article>
              <span>01 / TRUST BOUNDARIES</span>
              <h3>Verification is business logic.</h3>
              <p>
                Pending and rejected detections are excluded from generation
                context. A UI badge alone never makes a feature a fact.
              </p>
            </article>
            <article>
              <span>02 / INDEPENDENT CHECKS</span>
              <h3>Generation ≠ validation.</h3>
              <p>
                Claims are checked after a draft is written. Matching evidence
                for one phrase never supports the rest of an embellished
                sentence.
              </p>
            </article>
            <article>
              <span>03 / FULL APPLICATION</span>
              <h3>A backend with boundaries.</h3>
              <p>
                The full app includes owner-scoped authorization, PostgreSQL
                history, private uploads, provider adapters, and automated
                tests.
              </p>
            </article>
            <article>
              <span>04 / HONEST LIMITATIONS</span>
              <h3>Human judgment stays essential.</h3>
              <p>
                Exact matching can flag valid paraphrases and miss nuanced
                problems. Neither this demo nor the full app guarantees legal
                compliance.
              </p>
            </article>
          </div>
        </section>
      </main>
      <footer>
        <a className="logo" href="#">
          listly<span>AI</span>
        </a>
        <p>
          Evidence-grounded real-estate marketing. A software engineering
          portfolio project.
        </p>
        <a
          href={`${repo}/blob/main/docs/AI_SAFETY.md`}
          target="_blank"
          rel="noreferrer"
        >
          Safety & limitations →
        </a>
      </footer>
    </>
  );
}
