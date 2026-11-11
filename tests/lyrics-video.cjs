/* Deterministic lyric timing and Romanization regression tests.
 * Transpiles the pure TS utilities without browser APIs or internet.
 */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),ts=require('typescript')
const source=fs.readFileSync(path.join(__dirname,'..','src','services','lyricsVideo.ts'),'utf8')
const compiled=ts.transpileModule(source,{fileName:'lyricsVideo.ts',compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText
const context={module:{exports:{}},exports:{},console,URL,setTimeout}
context.exports=context.module.exports
vm.runInNewContext(compiled,context,{filename:'lyricsVideo.js'})
const {parseLyricText,romanize,fromWordCues,editLine,activeLineIndex,wordsText}=context.module.exports
assert.equal(romanize('Привет'),'Privet')
assert.equal(romanize('Hello world'),'Hello world')
const parsed=parseLyricText('[00:05.00] Hello sunshine\n[00:08.50] Another line',15)
assert.equal(parsed.lines.length,2)
assert.equal(parsed.lines[0].start,5)
assert.ok(parsed.lines[0].end<8.5)
assert.equal(wordsText(parsed.lines[0]),'Hello sunshine')
assert.equal(activeLineIndex(parsed.lines,6),0)
assert.equal(activeLineIndex(parsed.lines,9),1)
assert.equal(activeLineIndex(parsed.lines,0),-1)
const manual=parseLyricText('A little tune\nWith a beat',20)
assert.equal(manual.lines.length,2)
assert.equal(manual.lines[0].start,0)
assert.equal(manual.lines[1].start,10)
const edited=editLine(manual.lines[0],{text:'New line of words',start:2,end:4},20)
assert.equal(edited.words.length,4)
assert.equal(edited.start,2)
assert.equal(edited.end,4)
for(const word of edited.words){assert.ok(word.end>word.start);assert.ok(word.start>=edited.start);assert.ok(word.end<=edited.end+.001)}
const ai=fromWordCues([{text:' Привет',timestamp:[1,1.4]},{text:' world',timestamp:[1.5,2.1]}],10)
assert.equal(ai.length,1)
assert.equal(wordsText(ai[0]),'Privet world')
assert.equal(ai[0].start,1)
assert.equal(ai[0].end,2.1)
console.log('PASSED: lyrics timing, LRC line parsing, word highlighting index, manual edit, Roman transliteration')
