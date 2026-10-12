import { Navigate, useParams } from 'react-router-dom'
import Seo from '../components/Seo'
import AudioStudio from '../editor/AudioStudio'
import { getAudioTool } from '../data/tools'

export default function Tool() {
  const { toolId } = useParams()
  const tool = getAudioTool(toolId)
  if (!tool) return <Navigate to="/features" replace />
  return <><Seo title={`${tool.name} Tool`} path={`/tool/${tool.id}`} /><AudioStudio focusToolId={tool.id} /></>
}
