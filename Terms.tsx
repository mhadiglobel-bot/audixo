import Seo from '../components/Seo'
import SiteShell from '../components/SiteShell'
import { Link } from 'react-router-dom'

export default function Terms() {
  return <SiteShell><Seo title="Terms & Conditions" path="/terms" />
    <main className="page-shell legal-page-v5 v11-legal-page">
      <div className="page-hero-v5"><div className="eyebrow"><span/> LEGAL</div><h1>Terms & Conditions</h1><p>Last updated: October 2026</p></div>
      <article className="legal-card-v5 glass-panel v11-neon-card neon-duo">
        <h2>Use of Audixo</h2><p>Audixo provides browser-based audio conversion and editing utilities. You are responsible for confirming that your source media and intended use are lawful and permitted.</p>
        <h2>Imported media and AI stems</h2><p>Use Audixo only with media you own or have permission to edit. AI stems can contain artifacts or instrument bleed. The browser model estimates broad source groups; it cannot reliably recover every original instrument, singer or applied effect.</p>
        <h2>Copyright and ownership</h2><p>Audixo does not claim ownership of third-party songs, recordings, videos, samples, stems or other media. Copyright and related rights remain with their respective owners.</p>
        <h2>Local Library is not backup storage</h2><p>The Library is a convenience feature with a 21-item limit, not a permanent backup service. Browser cleanup, device changes, storage limits or privacy settings may remove locally saved exports.</p>
        <h2>Output availability</h2><p>Browser decoding support, local device resources, memory limits and export settings can affect preview or output availability. Audio quality depends on the source and the selected format. Users remain responsible for media they have the right to process.</p>
        <h2>Service changes</h2><p>Features, limits and supported formats may be changed, improved or removed as the product evolves.</p><p><Link to="/privacy">Read the Audixo Privacy Policy</Link> for details about browser-local files, AI model delivery and Library storage.</p>
      </article>
    </main>
  </SiteShell>
}
