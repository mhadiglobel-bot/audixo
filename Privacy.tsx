import Seo from '../components/Seo'
import SiteShell from '../components/SiteShell'

export default function Privacy() {
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
