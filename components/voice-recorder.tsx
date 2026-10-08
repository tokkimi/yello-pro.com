'use client';
import {useEffect,useRef,useState} from 'react';
import {mediaStore} from '@/lib/local-media';
import {Mic,Square,Trash2,Check,Loader2} from 'lucide-react';
// Records an audio note during a visit and transcribes it live with the browser
// Web Speech API (fr-CA). When speech recognition or the microphone is not
// available it falls back to a typed note, so a transcript is always produced.
export type VoiceNote={transcript:string;blob:Blob|null;mime:string;duration:number};
const pickMime=()=>{if(typeof MediaRecorder==='undefined')return '';for(const m of ['audio/webm;codecs=opus','audio/webm','audio/mp4','audio/ogg'])if(MediaRecorder.isTypeSupported?.(m))return m;return '';};
export default function VoiceRecorder({onSave,busy=false,storageKey}:{storageKey:string;onSave:(note:VoiceNote)=>void|Promise<void>;busy?:boolean}){
 const [mode,setMode]=useState<'idle'|'recording'|'review'>('idle');
 const [transcript,setTranscript]=useState('');
 const [interim,setInterim]=useState('');
 const [elapsed,setElapsed]=useState(0);
 const [error,setError]=useState('');
 const [speechOn,setSpeechOn]=useState(false);
 const rec=useRef<MediaRecorder|null>(null);
 const stream=useRef<MediaStream|null>(null);
 const chunks=useRef<Blob[]>([]);
 const recognition=useRef<any>(null);
 const timer=useRef<any>(null);
 const stopping=useRef(false);
 const mime=useRef('');
 const latest=useRef({transcript:'',elapsed:0});latest.current={transcript,elapsed};
 const restored=useRef(false);
 const writeChain=useRef(Promise.resolve());
 function persist(){const snapshot={...latest.current,mime:mime.current,blob:new Blob(chunks.current,{type:mime.current||'audio/webm'})};writeChain.current=writeChain.current.then(()=>mediaStore(storageKey,snapshot)).then(()=>{}).catch(()=>setError('Sauvegarde locale indisponible. Gardez cette page ouverte jusqu’à l’enregistrement.'));}
 useEffect(()=>{let live=true;mediaStore<{transcript:string;elapsed:number;mime:string;blob:Blob}>(storageKey).then(saved=>{if(live&&saved){setTranscript(saved.transcript);setElapsed(saved.elapsed);mime.current=saved.mime;chunks.current=saved.blob.size?[saved.blob]:[];setMode('review');setError('Note récupérée sur cet appareil. Vérifiez puis enregistrez-la.')}}).catch(()=>{}).finally(()=>{restored.current=true});return()=>{live=false}},[storageKey]);
 useEffect(()=>{if(restored.current&&mode!=='idle')persist()},[transcript,mode]);
 const speechSupported=typeof window!=='undefined'&&!!((window as any).SpeechRecognition||(window as any).webkitSpeechRecognition);
 useEffect(()=>()=>cleanup(),[]);
 function cleanup(){stopping.current=true;try{rec.current?.state!=='inactive'&&rec.current?.stop();}catch{}try{recognition.current?.stop();}catch{}stream.current?.getTracks().forEach(t=>t.stop());clearInterval(timer.current);}
 async function start(){
  setError('');setTranscript('');setInterim('');setElapsed(0);chunks.current=[];stopping.current=false;
  let gotStream=false;
  try{
   if(navigator.mediaDevices?.getUserMedia){
    const s=await navigator.mediaDevices.getUserMedia({audio:true});stream.current=s;gotStream=true;
    mime.current=pickMime();
    const mr=new MediaRecorder(s,mime.current?{mimeType:mime.current,audioBitsPerSecond:64000}:{audioBitsPerSecond:64000});rec.current=mr;
    mr.ondataavailable=e=>{if(e.data.size>0){chunks.current.push(e.data);persist();}};
    mr.start(1000);
   }
  }catch{setError('Micro indisponible — dictez ou saisissez la note ci-dessous.');}
  // Live transcription (independent of the recorder so a typed fallback still works).
  if(speechSupported){
   try{
    const SR=(window as any).SpeechRecognition||(window as any).webkitSpeechRecognition;const r=new SR();
    r.lang='fr-CA';r.continuous=true;r.interimResults=true;
    r.onresult=(e:any)=>{let fin='',intm='';for(let i=e.resultIndex;i<e.results.length;i++){const tr=e.results[i][0].transcript;if(e.results[i].isFinal)fin+=tr;else intm+=tr;}if(fin)setTranscript(p=>(p?p+' ':'')+fin.trim());setInterim(intm);};
    r.onerror=(e:any)=>{if(e.error==='not-allowed'||e.error==='service-not-allowed')setError('Transcription refusée — saisissez la note manuellement.');};
    r.onend=()=>{setSpeechOn(false);if(!stopping.current){try{r.start();setSpeechOn(true);}catch{}}};
    r.start();recognition.current=r;setSpeechOn(true);
   }catch{setSpeechOn(false);}
  }
  timer.current=setInterval(()=>setElapsed(e=>{if(e>=179){stop();return 180;}return e+1;}),1000);
  setMode('recording');
  if(!gotStream&&!speechSupported)setError('Enregistrement audio non pris en charge sur cet appareil. Saisissez la note ci-dessous.');
 }
 function stop(){
  stopping.current=true;clearInterval(timer.current);setInterim('');
  try{recognition.current?.stop();}catch{}
  const mr=rec.current;
  if(mr&&mr.state!=='inactive'){mr.onstop=()=>{stream.current?.getTracks().forEach(t=>t.stop());setMode('review');};mr.stop();}
  else{stream.current?.getTracks().forEach(t=>t.stop());setMode('review');}
 }
 async function save(){
  const blob=chunks.current.length?new Blob(chunks.current,{type:mime.current||'audio/webm'}):null;
  try{await onSave({transcript:transcript.trim(),blob,mime:mime.current||'audio/webm',duration:elapsed});reset();}catch(e){setError((e as Error).message||'Enregistrement impossible. La note reste sur cet appareil.');}
 }
 function reset(){writeChain.current=writeChain.current.then(()=>mediaStore(storageKey,undefined,true)).then(()=>{});setMode('idle');setTranscript('');setInterim('');setElapsed(0);setError('');chunks.current=[];}
 const mmss=(s:number)=>`${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;
 return <div className="voice-recorder">
  <div className="voice-head">
   <div className="voice-orb">{mode==='recording'?<span className="voice-wave" aria-hidden>{Array.from({length:9}).map((_,i)=><i key={i} style={{animationDelay:`${i*90}ms`}}/>)}</span>:<Mic size={20}/>}</div>
   <div className="voice-head-text">
    <b>Note vocale</b>
    <small>{mode==='recording'?`Enregistrement… ${mmss(elapsed)}`:mode==='review'?`Note de ${mmss(elapsed)} prête`:speechSupported?'Dictez, la transcription se fait en direct.':'Dictez puis vérifiez la transcription saisie.'}</small>
   </div>
   {mode==='idle'&&<button type="button" className="btn primary small" onClick={start} disabled={busy}><Mic size={16}/>Dicter</button>}
   {mode==='recording'&&<button type="button" className="btn secondary small voice-stop" onClick={stop}><Square size={15}/>Arrêter</button>}
  </div>
  {mode==='recording'&&speechOn&&<p className="voice-hint">● Transcription en direct activée</p>}
  {(mode==='recording'||mode==='review')&&<textarea className="voice-transcript" value={transcript+(interim?(transcript?' ':'')+interim:'')} onChange={e=>{setTranscript(e.target.value);setInterim('');}} placeholder="La transcription apparaîtra ici. Vous pouvez la corriger avant de l’enregistrer." rows={4}/>}
  {error&&<p className="voice-error">{error}</p>}
  {mode==='review'&&<div className="voice-actions">
   <button type="button" className="btn ghost small" onClick={reset}><Trash2 size={15}/>Reprendre</button>
   <button type="button" className="btn primary small" onClick={save} disabled={busy||!transcript.trim()}>{busy?<Loader2 size={15} className="spin"/>:<Check size={15}/>}Enregistrer la note</button>
  </div>}
 </div>;
}
