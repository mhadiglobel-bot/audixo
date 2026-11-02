export type BlogPost = {
  slug: string
  title: string
  excerpt: string
  readTime: string
  category: string
  sections: { heading: string; body: string }[]
}

export const blogs: BlogPost[] = [
{"slug": "record-microphone-in-browser", "title": "Record a Voice Take and Add It to Your Mix", "excerpt": "Capture a microphone take, pause between phrases and bring the recording into your audio timeline.", "readTime": "3 min", "category": "Recording", "sections": [{"heading": "Set up before you record", "body": "Open Audio Recorder or choose Record in Studio. The browser asks for microphone permission only when you start. Check the selected microphone in your browser and operating system; a headset microphone may differ from your laptop microphone. Work in a quiet space and record a short test phrase before committing to a longer take. The recording is captured locally and does not need a converter server."}, {"heading": "Pause without creating another file", "body": "Use Pause to stop capturing during a break, then Resume to continue the same take. Paused time is excluded from the recording timer. Stop finalizes the take so you can listen to it in the preview player. If the take is wrong, record again before adding it. Audixo stops an active take at ten minutes to keep the capture bounded."}, {"heading": "Add the take as a separate layer", "body": "Choose Add to timeline to import the recording as its own track. Your existing tracks stay in place. Solo the new voice to inspect room noise and clipping, then play it with the rest of the arrangement. Trim the edges directly on its waveform. A dedicated track lets you change voice level or add Echo Vocal without processing the backing music."}, {"heading": "Keep a clean version", "body": "Preview before adding a preset, then compare the treated voice at a similar level. Applied edits gives each effect a remove button, so you can take off a reverb or slowdown while keeping the trim. Export a clean WAV copy if you expect to edit again. Browser capture format varies by device; Audixo imports the recorded format where that browser can decode it."}]},
{"slug": "organize-audio-library", "title": "A Simple Workflow for Your 21 Saved Mixes", "excerpt": "Play saved exports, reopen one in Studio or Vocals and keep your browser Library useful.", "readTime": "3 min", "category": "Workflow", "sections": [{"heading": "Save a result you can recognize", "body": "Library stores finished exports, not a fully editable session with every original source and effect setting. Give an export a useful name before saving: project, version and purpose are more helpful than a generic final name. You can save MP3 or WAV when exporting from the main or focused editor. The audio stays in this browser profile."}, {"heading": "Listen before reopening", "body": "Each saved card has playback, seek and volume controls. Starting another card pauses the previous player so previews do not overlap. Use the waveform editor when you want a new trim or effects; use Vocals when you want the model to estimate layers from the saved mix. Those buttons import the selected Library audio directly, avoiding another manual download and upload."}, {"heading": "Understand the 21-item limit", "body": "Audixo retains up to 21 saved exports. When you save a twenty-second, it removes the oldest saved item. Use Remove on an item you no longer need, and keep important downloads in your normal folders. Reopened mixes start a new editing session; removing an effect from the old flattened export is different from removing an active edit in the original session."}, {"heading": "Keep a separate backup", "body": "Site data is tied to your browser profile and domain. A private browsing session, a different device, clearing site storage or a storage quota can make Library items disappear or unavailable. Library is a convenience shelf for recent work, not a permanent cloud archive. Download important masters during export and copy them to your usual backup location."}]},
{"slug": "removable-effects-and-duplicate", "title": "Edit a Selected Phrase without Rebuilding the Whole Song", "excerpt": "Use selected ranges, removable presets and duplicates to explore an idea while retaining the original source.", "readTime": "3 min", "category": "Editing", "sections": [{"heading": "Select the source you want to change", "body": "Choose a track, switch to Select range and highlight a phrase. Exact Start seconds and End seconds help you enter boundaries that are awkward to drag. Applied presets use the selected audio when a range is active, and the selected track audio when no range is active. Keep the range visible so the intended part is clear before you apply a change."}, {"heading": "Choose what should remain", "body": "Keep selected seconds removes the audio outside the selection. Remove & join removes the selection and retains the beginning and ending. For aligned AI stems, enable the all-tracks option so those cuts stay synchronized. Listen across the new join to check phrasing and rhythm. You can remove either operation from Applied edits to restore source audio."}, {"heading": "Repeat a phrase with Duplicate", "body": "Duplicate range appends a copy of the chosen audio after the existing recording on that track. Duplicate audio repeats the track audio when no selection is active. Copies preserve the current sound. The duplicate has an entry in Applied edits, and copied sound settings can be adjusted separately. Removing the duplicate removes its appended audio and associated copied settings."}, {"heading": "Remove one change at a time", "body": "Applied edits lists trim, cut, duplicate and sound changes under the timeline. Remove a mistaken Echo preset there while retaining another active effect. Undo and Redo offer a quick way to step through recent changes. Clear edits restores original imported sources and removes added duplicates; it keeps independently imported tracks. Export only after checking the current arrangement."}]},
 {slug:'separate-vocals-and-instruments',title:'How to Separate Vocals, Music and Instruments into Editable Stems',excerpt:'Separate lyrics/vocals from music, drums, bass and other instruments, inspect artifacts and rebuild the mix.',readTime:'3 min',category:'Vocal Studio',sections:[
 {heading:'Start with a clean source',body:'Use the highest-quality recording you have permission to process. Lossy compression, distortion and heavy reverb can make instrument boundaries harder for an AI model to identify.'},
 {heading:'Choose the stem groups you need',body:'Audixo downloads a Demucs AI model on first use, then estimates Lyrics/Vocals, Music, Drums, Bass and Other Instruments on your device. These are model predictions rather than the original session tracks. Keep input under six minutes and 120 MB. The main singing voice and backing music are separated first, while individual singers and every original instrument may still contain bleed or artifacts.'},
 {heading:'Listen to each stem in context',body:'Solo a track to find bleed, metallic artifacts or missing transients, then listen again with the other tracks enabled. Small artifacts are sometimes less audible in the combined mix.'},
 {heading:'Keep the timing aligned',body:'The separated tracks start together. When removing a middle section, cut all synchronized tracks at the same times to keep the rhythm and vocal phrasing aligned.'},
 {heading:'Save the useful outputs',body:'Keep the returned stems in the Audixo editor, mute or replace any layer, and add a new beat, keys, guitar, synth, bassline or transition from the separate Music & Beats library. Download important WAV/MP3 results before clearing browser data. Rights in the original recording still apply.'}]},
 {slug:'lofi-and-echo-vocal-effects',title:'Build a Lo-fi or Echo Vocal without Losing Clarity',excerpt:'Shape a vocal with controlled EQ, delay and level before adding it back into your mix.',readTime:'2 min',category:'Vocal Effects',sections:[
 {heading:'Begin with the dry vocal',body:'Listen to the vocal before adding any effect. Check for clipped syllables, distortion and excessive room sound. Effects cannot reliably restore details that the source never captured.'},
 {heading:'Warm the tone for a lo-fi feel',body:'Lower high-frequency energy slightly and add modest warmth in the low mids. Too much bass can make the vocal feel muffled, while too little high-frequency energy can reduce intelligibility.'},
 {heading:'Use delay as a supporting layer',body:'Start with a low echo amount and conservative feedback. Increase repeat time until the echoes support the phrasing instead of overlapping every word. Short slap delays create a different feel from long rhythmic repeats.'},
 {heading:'Compare at similar levels',body:'A louder processed version can seem more impressive even when it is less clear. Match the perceived level of the before and after recordings, then decide whether the effect improves the song.'}]},
 {slug:'trim-long-audio-without-losing-duration',title:'Trim a Long Recording without Losing the Full Timeline',excerpt:'Keep the full duration visible and cut standard MP3/WAV locally at original quality.',readTime:'2 min',category:'Long Audio',sections:[
 {heading:'Why long audio needs a different workflow',body:'A compressed MP3 expands substantially when decoded into floating-point audio. A two-hour stereo recording at 44.1 kHz needs roughly 2.5 GB for its raw samples alone, before effects, copies and export buffers.'},
 {heading:'Keep the complete duration visible',body:'Streaming playback reads the recording as needed instead of decoding the whole source into an in-memory waveform. The timeline uses the original media duration so you can reach the beginning, middle and ending.'},
 {heading:'Trim the edges or remove a middle section',body:'Drag the side handles to choose the source range, or enter exact seconds. To remove an unwanted middle section, mark its start and end and join the remaining parts. Listen around each boundary to check the transition.'},
 {heading:'Export with the right processing path',body:'For standard MP3 and PCM WAV, select Original quality and export the retained audio locally without decoding the entire recording. MP3 boundaries align to frames, so timing is approximate by a few milliseconds and joins can contain a small artifact. If you want new bitrate, fades, volume or speed, retain ten minutes or less for local re-encoding. Unsupported long formats need conversion before importing.'}]},

  {
    slug: 'how-to-cut-audio-precisely',
    title: 'How to Cut Audio at the Exact Second',
    excerpt: 'Use direct clip handles, exact source times and middle cuts for cleaner exports.',
    readTime: '2 min', category: 'Editing',
    sections: [
      { heading: 'Start with a visible range', body: 'Zoom until the waveform is readable, then drag a clear IN and OUT range. Precision comes from seeing the edit before committing it.' },
      { heading: 'Trim the edges or cut the middle', body: 'Drag the clip handles directly to trim either end. To remove an internal section while keeping the beginning and ending, use Cut middle and Remove & join.' },
      { heading: 'Listen around the edit', body: 'Preview a few seconds before and after the cut. This catches clicks, clipped syllables and awkward transitions before export.' },
    ],
  },
  {
    slug: 'reverb-delay-song-edits',
    title: 'Reverb and Delay for Better Song Edits',
    excerpt: 'Use space effects on selected moments without washing out the entire track.',
    readTime: '2 min', category: 'Effects',
    sections: [
      { heading: 'Keep effects regional', body: 'A transition, intro or vocal phrase often benefits from reverb while the rest of the song stays clear. Region-only processing preserves contrast.' },
      { heading: 'Balance wet level and feedback', body: 'Reverb adds depth while delay creates audible repeats. High feedback can crowd a mix quickly, so increase it gradually.' },
      { heading: 'Protect the final peak', body: 'Space effects can add energy after the original sound. A limiter and sensible gain staging reduce accidental clipping.' },
    ],
  },
  {
    slug: '8d-16d-stereo-motion',
    title: 'How 8D and 16D Style Stereo Motion Works',
    excerpt: 'Understand left-right motion, movement depth and why headphones matter.',
    readTime: '2 min', category: 'Spatial Audio',
    sections: [
      { heading: 'It is stereo motion, not magic', body: 'The familiar 8D effect is usually automated stereo panning, often paired with ambience. The sound appears to travel between ears on headphones.' },
      { heading: 'Control speed and depth', body: 'Motion speed determines how quickly the sound moves. Depth controls how far left and right it travels. Extreme settings can become tiring.' },
      { heading: 'Use movement deliberately', body: 'A moving intro, breakdown or selected vocal line can feel dramatic. Constant aggressive movement across a full track can distract from the music.' },
    ],
  },
  {
    slug: 'pitch-speed-reverse-audio',
    title: 'Pitch, Speed and Reverse Audio Explained',
    excerpt: 'What happens when you slow a clip, change tape-style pitch or reverse a section.',
    readTime: '2 min', category: 'Creative Editing',
    sections: [
      { heading: 'Speed changes timing', body: 'Slower playback makes a clip longer while faster playback shortens it. Browser tools may use tape-style processing where pitch and timing interact.' },
      { heading: 'Pitch changes character', body: 'Lower pitch can make vocals feel deeper while higher pitch can brighten or stylize a sound. Large shifts create obvious artifacts and should be previewed.' },
      { heading: 'Reverse creates transitions', body: 'Reversing a short phrase, cymbal or ambience can create useful build-ups and transitions without needing a large plugin chain.' },
    ],
  },
  {
    slug: 'export-320-kbps-mp3',
    title: 'When to Export 320 kbps MP3 or WAV',
    excerpt: 'Choose a final format based on sharing, size and editing needs.',
    readTime: '2 min', category: 'Export',
    sections: [
      { heading: 'MP3 is convenient', body: 'A 320 kbps MP3 is compact and broadly compatible, which makes it practical for listening and sharing.' },
      { heading: 'WAV keeps PCM audio', body: 'WAV files are much larger but avoid another lossy encode. They are the safer choice when the result will be edited again.' },
      { heading: 'Avoid unnecessary clipping', body: 'A louder file is not automatically a better file. Use sensible gain, a limiter and optional peak normalization.' },
    ],
  },
  {
    slug: 'browser-audio-privacy',
    title: 'Why Local Browser Audio Editing Can Be Useful',
    excerpt: 'A simple explanation of local processing, browser storage and privacy tradeoffs.',
    readTime: '2 min', category: 'Workflow',
    sections: [
      { heading: 'Local processing reduces upload friction', body: 'When editing happens in the browser, the tool can work with local files without first sending each track to an application server.' },
      { heading: 'Browser storage is device-specific', body: 'A local library is convenient, but it is tied to the browser profile and can disappear if site data is cleared.' },
      { heading: 'Keep your masters elsewhere', body: 'A browser library is a convenience layer, not a permanent backup system. Important masters should still be stored in your normal file backup workflow.' },
    ],
  },
  {
    slug: 'quick-trim-audio-with-fades',
    title: 'Quick Audio Trimming with Exact Times and Fades',
    excerpt: 'Trim both ends of an audio file, enter exact timestamps, adjust speed or volume and create cleaner starts and endings.',
    readTime: '2 min', category: 'Quick Tools',
    sections: [
      { heading: 'Use handles for rough placement', body: 'Drag the start and end handles until the selected range is close to the section you want to keep.' },
      { heading: 'Use exact time fields for precision', body: 'When a drag handle is not precise enough, type the exact start and end timestamps. This is especially useful for spoken clips and short music edits.' },
      { heading: 'Finish with volume, speed and fades', body: 'Small fade-in and fade-out values can remove abrupt edges. Preview volume and playback speed changes before exporting the final MP3 or WAV.' },
    ],
  },
]
