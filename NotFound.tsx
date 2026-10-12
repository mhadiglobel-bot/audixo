import { Link } from 'react-router-dom'
import SiteShell from '../components/SiteShell'

export default function NotFound() {
  return <SiteShell><main className="page-shell content-page-v5"><div className="page-hero-v5"><div className="eyebrow"><span/> 404</div><h1>This page drifted out of the mix.</h1><p>The route does not exist.</p><Link to="/" className="button button-primary">Back Home</Link></div></main></SiteShell>
}
