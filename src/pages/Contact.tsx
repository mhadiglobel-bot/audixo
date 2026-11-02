import Seo from '../components/Seo'
import SiteShell from '../components/SiteShell'
import {site,contactEmailReady} from '../config/site'

export default function Contact(){
 return <SiteShell><Seo title="Contact AUDIXO | Official Support" description="AUDIXO's official support email is coming soon. Find updates, audio tools and help inside the AUDIXO Online Audio Studio." path="/contact"/>
  <main className="page-shell ax39-contact"><div className="ax25-kicker"><i/> AUDIXO / CONTACT</div><section className="ax39-contact-grid"><div className="ax39-contact-copy"><h1>Good sound<br/><em>starts here.</em></h1><p>We're building a simpler way for creators to connect with AUDIXO. Product questions, feature ideas and feedback will have a home here soon.</p><div className="ax39-contact-pill"><span/> OFFICIAL SUPPORT CHANNEL</div></div><div className="ax39-contact-card"><div className="ax39-contact-art"><img src="/audixo-official-symbol.png" alt=""/></div><small>AUDIXO / SUPPORT</small><h2>{contactEmailReady?"We are ready to listen.":"Official email"}<br/><em>{contactEmailReady?'Get in touch.':'coming soon.'}</em></h2><p>{contactEmailReady?'Reach out through our official contact address.':'Our professional support email is being set up. We will display it here as soon as it is ready. No contact form, no temporary addresses.'}</p>{contactEmailReady?<a href={`mailto:${site.email}`}>{site.email} ↗</a>:<div className="ax39-contact-coming">✦ An official inbox is on its way</div>}</div></section></main>
 </SiteShell>
}
