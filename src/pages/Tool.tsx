import { Navigate, useParams, Link } from 'react-router-dom'
import Seo from '../components/Seo'
import SiteShell from '../components/SiteShell'
import AudioStudio from '../editor/AudioStudio'
import { getAudioTool } from '../data/tools'

export default function Tool() {
  const { toolId } = useParams()
  const tool = getAudioTool(toolId)
  if (!tool) return <Navigate to="/features" replace />
  return <><Seo title={`${tool.name} Tool`} path={`/tool/${tool.id}`} /><AudioStudio focusToolId={tool.id} /></>
}

// Bundled from src/pages/NotFound.tsx to keep GitHub browser uploads below 100 files.
export function NotFound() {
  return <SiteShell><main className="page-shell content-page-v5"><div className="page-hero-v5"><div className="eyebrow"><span/> 404</div><h1>This page drifted out of the mix.</h1><p>The route does not exist.</p><Link to="/" className="button button-primary">Back Home</Link></div></main></SiteShell>
}
