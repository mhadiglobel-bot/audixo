import assert from 'node:assert/strict'
import {readFileSync,existsSync} from 'node:fs'
const txt=p=>readFileSync(p,'utf8')
const home=txt('dist/index.html')
const site=home.match(/<script id="site-identity-schema" type="application\/ld\+json">([\s\S]*?)<\/script>/)
assert.ok(site,'Homepage requires crawler-readable WebSite identity')
const identity=JSON.parse(site[1])
assert.equal(identity['@type'],'WebSite')
assert.equal(identity.name,'AUDIXO')
assert.equal(identity.url,'https://audixo.tiers.rest/')
assert.ok(identity.alternateName.includes('audixo.tiers.rest'))
assert.ok(existsSync('dist/favicon.ico')&&readFileSync('dist/favicon.ico').length>1000,'Brand icon must ship')
assert.ok(home.includes('href="/favicon.png"'),'Brand PNG fallback must ship')
const sitemap=txt('dist/sitemap.xml')
assert.ok(sitemap.includes('https://audixo.tiers.rest/tools/vocals'))
assert.ok(!sitemap.includes('audixo.vercel.app'))
assert.ok(!sitemap.includes('/tools/mashup'))
for(const route of ['editor','tools/vocals','features','how-it-works']){
 const page=txt('dist/'+route+'/index.html')
 assert.ok(page.includes('rel="canonical" href="https://audixo.tiers.rest/'+route+'"'),'Wrong canonical '+route)
}
const studio=txt('src/editor/AudioStudio.tsx')
assert.ok(studio.indexOf('className="ax85-timeline-stack"')<studio.indexOf('<AppliedEdits')&&studio.indexOf('<AppliedEdits')<studio.indexOf('<Inspector'),'Applied edits belongs under timeline')
const fx=txt('src/components/StemMixerStudio.tsx')
for(const anchor of ['g.presence.gain.setTargetAtTime','automate(presence.gain,c.presence)','g.feedback.gain.setTargetAtTime','feedback.gain.value=clamp(c.feedback/100',"aria-label={'Increase '+name}","aria-label={'Decrease '+name}"]){
 assert.ok(fx.includes(anchor),'FX regression '+anchor)
}
console.log('V85 release check passed: website identity, favicon, sitemap, studio layout, stem live/export DSP.')

