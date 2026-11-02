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

// Bundled from src/pages/Privacy.tsx to keep GitHub browser uploads below 100 files.
export function Privacy() {
  return <SiteShell><Seo title="Privacy Policy" path="/privacy" />
    <main className="page-shell legal-page-v5 v11-legal-page">
      <div className="page-hero-v5"><div className="eyebrow"><span/> PRIVACY</div><h1>Privacy Policy</h1><p>Last updated: October 2026</p></div>
      <article className="legal-card-v5 glass-panel v11-neon-card neon-green">
        <h2>Uploaded audio editing</h2><p>Audixo is designed to decode, edit, preview and export audio you upload inside the browser. Local editing and AI separation run on this device. Standard MP3/WAV long-file trims use local audio slices; other long-file effects are limited to short retained sections. No account is required.</p>
        <h2>Browser AI model</h2><p>On first use, local vocal separation downloads an AI model from Hugging Face; that host receives the usual network request information. The model may be cached in browser storage. Uploaded audio is processed on this device and is not sent to that model host.</p><h2>Microphone recording</h2><p>Recording starts only after you request it and grant browser microphone permission. The captured audio stays in the current session unless you export it or save an export to Library.</p><h2>Mashup and focused tools</h2><p>Mashup Songs and the focused editors process imported audio in the browser. A rendered preview or export is created from the layers and settings you choose. Audixo does not require a cloud media account for these workflows.</p>
        <h2>Local library</h2><p>If you choose to save an export to the Library, the audio file and its metadata are stored in browser storage on the current device and browser profile. The Library keeps up to 21 saved exports. Clearing site data, changing browsers or using another device can remove or hide these items.</p>
        <h2>Technical data</h2><p>A production deployment may use hosting, logging, analytics or error-monitoring services configured by the site operator. This policy should be updated before enabling any additional service that collects personal data, analytics identifiers or persistent server-side media uploads.</p>
        <h2>Third-party media</h2><p>Audixo does not acquire ownership of media merely because it is analyzed, mixed or edited. Rights remain with their respective owners.</p>
        <h2>Contact</h2><p>Use the Contact page for privacy questions. The Contact page provides the operator’s support channel when configured.</p>
      </article>
    </main>
  </SiteShell>
}

// Bundled from src/pages/Copyright.tsx to keep GitHub browser uploads below 100 files.
export function Copyright(){return <SiteShell><Seo title="Copyright & Media Rights" description="AUDIXO copyright policy, permitted media use, intellectual property and responsible downloads." path="/copyright"/>
 <main className="page-shell legal-page-v5 ax40-policy"><div className="page-hero-v5"><div className="eyebrow"><span/> LEGAL & MEDIA RIGHTS</div><h1>Copyright & Media Rights</h1><p>Read before processing or downloading content from third-party platforms.</p></div><article className="legal-card-v5 glass-panel"><h2>Only use content you have rights to use</h2><p>Upload, edit, separate, convert or download media only when you own it, have received permission, or have another lawful basis to do so. The availability of a download tool does not grant rights to use someone else's work.</p><h2>Third-party platforms</h2><p>Respect the terms of the source platform, artists, creators and rights holders. Certain content may not be downloadable, even if it can be previewed.</p><h2>Reporting an issue</h2><p>Our official support mailbox is being prepared. Until it is available, check this page for contact updates. We will publish a reliable contact method before accepting formal takedown notices.</p><p><Link to="/terms">Terms of Use</Link> · <Link to="/privacy">Privacy Policy</Link> · <Link to="/contact">Contact</Link></p></article></main></SiteShell>}
