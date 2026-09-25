import { supabase, ready } from '../app/auth.js';

const $=id=>document.getElementById(id);
const escapeHTML=(v='')=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
const fmtDate=v=>v?new Intl.DateTimeFormat('en-GB',{day:'numeric',month:'short',year:'numeric'}).format(new Date(v+'T12:00:00')):'Date unknown';
const uid=()=>crypto.randomUUID();

let ctx=null;
let archive=null;
let memories=[];
let mediaAssets=[];
let currentView='home';

async function hashFile(file){
  const buf=await file.arrayBuffer();
  const digest=await crypto.subtle.digest('SHA-256',buf);
  return [...new Uint8Array(digest)].map(b=>b.toString(16).padStart(2,'0')).join('');
}

function toast(message){
  const d=document.createElement('div');d.className='toast';d.textContent=message;document.body.appendChild(d);
  setTimeout(()=>d.remove(),2400);
}

async function ensureArchive(){
  const {data,error}=await supabase.from('mia_archives')
    .select('*').eq('owner_user_id',ctx.user.id).eq('is_primary',true).neq('status','archived').maybeSingle();
  if(error) throw error;
  if(data) return data;

  const {data:created,error:createError}=await supabase.from('mia_archives').insert({
    owner_user_id:ctx.user.id,
    title:'My story',
    subtitle:'Your life. Your people. Your story.',
    summary:'Your private MIA Memories archive.',
    status:'active',
    is_primary:true,
    metadata:{created_from:'mia_workspace'}
  }).select('*').single();
  if(createError) throw createError;
  return created;
}

async function loadWorkspace(){
  archive=await ensureArchive();
  const [m,a]=await Promise.all([
    supabase.from('mia_memories').select('*').eq('archive_id',archive.id).order('updated_at',{ascending:false}),
    supabase.from('mia_media_assets').select('*').eq('archive_id',archive.id).eq('status','uploaded').order('created_at',{ascending:false})
  ]);
  if(m.error) throw m.error;
  if(a.error) throw a.error;
  memories=m.data||[];
  mediaAssets=a.data||[];
}

function memoryView(m){
  return {
    id:m.id,title:m.title,story:m.story||'',date:m.memory_date,dateCertainty:m.date_confidence||'UNKNOWN',
    people:m.people_names||[],place:m.place_name||'',source:m.source_type||'Uploaded manually',
    visibility:m.visibility||'PRIVATE',recipient:m.recipient_name||'',releaseType:m.release_rule||'Available now',
    createdAt:m.created_at,updatedAt:m.updated_at
  };
}

async function signedMedia(memoryId){
  const asset=mediaAssets.find(x=>x.memory_id===memoryId);
  if(!asset) return null;
  const {data,error}=await supabase.storage.from('mia-originals').createSignedUrl(asset.storage_path,900);
  if(error||!data?.signedUrl) return null;
  return {...asset,url:data.signedUrl};
}

async function mediaHTML(m){
  const f=await signedMedia(m.id);
  if(!f) return '<div class="media-thumb"><span class="placeholder">✦</span></div>';
  if((f.mime_type||'').startsWith('image/')) return '<div class="media-thumb"><img src="'+escapeHTML(f.url)+'" alt=""></div>';
  if((f.mime_type||'').startsWith('video/')) return '<div class="media-thumb"><video src="'+escapeHTML(f.url)+'" muted playsinline></video></div>';
  if((f.mime_type||'').startsWith('audio/')) return '<div class="media-thumb"><span class="placeholder">♪</span></div>';
  return '<div class="media-thumb"><span class="placeholder">▤</span></div>';
}

async function memoryCard(raw){
  const m=memoryView(raw);
  return '<article class="memory-card">'+await mediaHTML(raw)+'<div class="memory-copy">'+
    '<div class="subtle">'+fmtDate(m.date)+' · '+escapeHTML(m.place||'Place not added')+'</div>'+
    '<h3>'+escapeHTML(m.title)+'</h3>'+
    '<p>'+escapeHTML(m.story||'No story added yet.')+'</p>'+
    '<div class="meta-row"><span class="pill">'+escapeHTML(m.dateCertainty)+'</span><span class="pill">'+escapeHTML(m.visibility)+'</span></div>'+
    '<div class="card-actions"><span class="subtle">'+(m.people.length?escapeHTML(m.people.join(' · ')):'People not added')+'</span><button class="link-btn" data-open="'+m.id+'">Open memory →</button></div>'+
    '</div></article>';
}

async function renderHome(){
  const people=new Set(memories.flatMap(m=>m.people_names||[]));
  const places=new Set(memories.map(m=>m.place_name).filter(Boolean));
  const later=memories.filter(m=>m.release_rule && !['Available now','Private'].includes(m.release_rule));
  const recent=memories.slice(0,3);
  const recentCards=(await Promise.all(recent.map(memoryCard))).join('');

  return '<section class="example-story">'+
    '<div class="example-story-copy"><span class="example-badge">ILLUSTRATIVE EXAMPLE STORY</span><p class="eyebrow" style="margin-top:18px">MARGARET’S STORY</p>'+
    '<h2>A life filled with family, seaside walks and notes worth keeping.</h2>'+
    '<p>This example shows how MIA can keep photographs, stories, people, places and messages together. Margaret is illustrative — not a real customer or testimonial.</p>'+
    '<blockquote>“The little things are often the things everyone remembers.”</blockquote>'+
    '<div class="example-story-actions"><a class="btn btn-soft" href="../stories.html">See how stories work</a><button class="btn btn-primary" id="exampleAdd">Start my own story</button></div></div>'+
    '<div class="example-story-media"><img src="../ChatGPT Image Sep 25, 2026, 02_53_45 PM (3).png" alt="Illustrative family memory example"></div></section>'+
    '<div class="hero-grid"><section class="story-card"><div><p class="eyebrow">YOUR LIFE · YOUR PEOPLE · YOUR STORY</p>'+
    '<h2>'+(memories.length?'Your memories, with the meaning kept around them.':'Start with one memory.')+'</h2>'+
    '<p>MIA keeps the photograph, place, people, date, voice, story, context and original source together — while keeping provenance quietly behind the human experience.</p>'+
    '<span class="cloud-status">Private cloud archive connected</span></div><div><button class="btn btn-primary" id="heroAdd">Preserve a memory</button></div></section>'+
    '<div class="stats"><div class="metric-card"><strong>'+memories.length+'</strong><span>memories preserved</span></div>'+
    '<div class="metric-card"><strong>'+people.size+'</strong><span>people connected</span></div>'+
    '<div class="metric-card"><strong>'+places.size+'</strong><span>places remembered</span></div>'+
    '<div class="metric-card"><strong>'+later.length+'</strong><span>for later</span></div></div></div>'+
    '<div class="section-head"><div><p class="eyebrow">CONTINUE YOUR STORY</p><h2>Recent memories</h2></div><p>Originals remain behind each memory.</p></div>'+
    (recent.length?'<div class="memory-grid">'+recentCards+'</div>':'<div class="empty recent-empty"><div class="recent-empty-icon">＋</div><h3>Nothing here yet</h3><p>Add a photograph, voice note, video, document or story to begin.</p><div class="recent-empty-actions"><button class="btn btn-primary" id="emptyUpload">Upload a memory</button><button class="btn btn-soft" id="emptyStory">Tell a story</button></div><p class="upload-note">Photos · video · voice · documents · up to 50 MB per file</p></div>');
}

async function renderMemories(){
  const cards=(await Promise.all(memories.map(memoryCard))).join('');
  return '<div class="section-head"><div><p class="eyebrow">MEMORIES</p><h2>All memories</h2></div><p>'+memories.length+' items</p></div>'+
  (cards?'<div class="memory-grid">'+cards+'</div>':'<div class="empty"><h3>No memories yet</h3><p>Preserve your first one.</p></div>');
}

function renderTimeline(){
  const groups={};
  memories.forEach(m=>{const y=m.memory_date?m.memory_date.slice(0,4):'Unknown';(groups[y]??=[]).push(m)});
  const years=Object.keys(groups).sort((a,b)=>b.localeCompare(a));
  if(!years.length) return '<div class="empty"><h3>Your timeline will grow here</h3></div>';
  return '<div class="timeline">'+years.map(y=>'<section class="year-group"><div class="year-label">'+escapeHTML(y)+'</div><div class="timeline-items">'+
    groups[y].map(m=>'<button class="timeline-item" data-open="'+m.id+'" style="width:100%;text-align:left;color:inherit"><time>'+fmtDate(m.memory_date)+'</time><b>'+escapeHTML(m.title)+'</b><span class="subtle">'+escapeHTML(m.place_name||'')+'</span></button>').join('')+
    '</div></section>').join('')+'</div>';
}

function renderPeople(){
  const map=new Map();
  memories.forEach(m=>(m.people_names||[]).forEach(p=>{if(!map.has(p))map.set(p,[]);map.get(p).push(m)}));
  const rows=[...map.entries()].sort((a,b)=>a[0].localeCompare(b[0]));
  return rows.length?'<div class="section-head"><div><p class="eyebrow">PEOPLE</p><h2>The people in your story</h2></div></div><div class="people-grid">'+
    rows.map(([p,ms])=>'<div class="person-card"><div class="avatar">'+escapeHTML(p.split(/\s+/).slice(0,2).map(x=>x[0]||'').join('').toUpperCase())+'</div><h3>'+escapeHTML(p)+'</h3><div class="subtle">'+ms.length+' '+(ms.length===1?'memory':'memories')+'</div></div>').join('')+'</div>':
    '<div class="empty"><h3>No people added yet</h3><p>Add names to memories and MIA will bring their story together.</p></div>';
}

function renderPlaces(){
  const map=new Map();
  memories.filter(m=>m.place_name).forEach(m=>{if(!map.has(m.place_name))map.set(m.place_name,[]);map.get(m.place_name).push(m)});
  const rows=[...map.entries()];
  return rows.length?'<div class="section-head"><div><p class="eyebrow">PLACES</p><h2>Where your story happened</h2></div><p>Locations are only added when supplied.</p></div><div class="place-grid">'+
    rows.map(([p,ms])=>'<div class="place-card"><p class="eyebrow">PLACE · USER SUPPLIED</p><h3>⌖ '+escapeHTML(p)+'</h3><div class="subtle">'+ms.length+' '+(ms.length===1?'memory':'memories')+' here</div></div>').join('')+'</div>':
    '<div class="empty"><h3>No places added yet</h3></div>';
}

function renderLater(){
  const rows=memories.filter(m=>m.release_rule && !['Available now','Private'].includes(m.release_rule));
  return rows.length?'<div class="section-head"><div><p class="eyebrow">FOR LATER</p><h2>Memories with release instructions</h2></div><p>Release decisions remain human-controlled.</p></div><div class="later-grid">'+
    rows.map(m=>'<button class="later-card" data-open="'+m.id+'" style="text-align:left;color:inherit"><p class="eyebrow">'+escapeHTML(m.release_rule)+'</p><h3>'+escapeHTML(m.title)+'</h3><div class="subtle">For '+escapeHTML(m.recipient_name||'a future recipient')+' · '+escapeHTML(m.visibility)+'</div></button>').join('')+'</div>':
    '<div class="empty"><h3>No messages or memories for later yet</h3><p>Create a memory and choose a future release instruction.</p></div>';
}

function renderImport(){
  return '<div class="import-panel"><section class="panel"><p class="eyebrow">IMPORT</p><h2>Bring memories in without changing the originals.</h2>'+
  '<p class="subtle">Direct private upload is connected. Platform archive importers remain staged for later releases.</p>'+
  '<div class="import-options"><button class="import-option" id="directImport"><span><b>Direct upload</b><small>Photo · video · voice · document</small></span><span>Working →</span></button>'+
  '<div class="import-option"><span><b>Google Photos Takeout</b><small>Originals + sidecar metadata</small></span><span class="pill">LATER</span></div>'+
  '<div class="import-option"><span><b>Facebook archive</b><small>Selected media + context</small></span><span class="pill">LATER</span></div></div></section>'+
  '<section class="panel"><p class="eyebrow">PROVENANCE</p><h2>What MIA records</h2><table class="audit-table">'+
  '<tr><th>Field</th><th>Status</th></tr><tr><td>Original file</td><td>Private Supabase Storage</td></tr><tr><td>Original filename/type/size</td><td>Recorded</td></tr>'+
  '<tr><td>SHA-256</td><td>Calculated on upload</td></tr><tr><td>Source</td><td>Recorded</td></tr><tr><td>Date confidence</td><td>Explicit</td></tr>'+
  '<tr><td>Release rule</td><td>Human-controlled</td></tr></table></section></div>';
}

async function render(){
  const titles={home:'Your story',timeline:'Timeline',memories:'Memories',people:'People',places:'Places',later:'For later',import:'Import memories'};
  $('viewTitle').textContent=titles[currentView];
  document.querySelectorAll('.nav-item').forEach(b=>b.classList.toggle('active',b.dataset.view===currentView));
  let html='';
  if(currentView==='home') html=await renderHome();
  else if(currentView==='memories') html=await renderMemories();
  else if(currentView==='timeline') html=renderTimeline();
  else if(currentView==='people') html=renderPeople();
  else if(currentView==='places') html=renderPlaces();
  else if(currentView==='later') html=renderLater();
  else html=renderImport();
  $('appView').innerHTML=html;
  bindDynamic();
}

function bindDynamic(){
  document.querySelectorAll('[data-open]').forEach(b=>b.addEventListener('click',()=>openDetail(b.dataset.open)));
  $('heroAdd')?.addEventListener('click',openAdd);
  $('exampleAdd')?.addEventListener('click',openAdd);
  $('directImport')?.addEventListener('click',openAdd);
  $('emptyStory')?.addEventListener('click',openAdd);
  $('emptyUpload')?.addEventListener('click',()=>{
    openAdd();
    setTimeout(()=>document.getElementById('media')?.click(),120);
  });
}

function resetForm(){
  $('memoryForm').reset();$('memoryId').value='';$('dateCertainty').value='USER SUPPLIED';$('visibility').value='PRIVATE';$('releaseType').value='Available now';$('fileStatus').innerHTML='';
}

function openAdd(){resetForm();$('dialogTitle').textContent='Add a memory';$('memoryDialog').showModal()}

function openEdit(id){
  const raw=memories.find(x=>x.id===id);if(!raw)return;
  const m=memoryView(raw);resetForm();$('dialogTitle').textContent='Edit memory';$('memoryId').value=m.id;$('title').value=m.title;$('date').value=m.date||'';$('dateCertainty').value=m.dateCertainty;$('story').value=m.story;$('people').value=m.people.join(', ');$('place').value=m.place;$('source').value=m.source;$('visibility').value=m.visibility;$('recipient').value=m.recipient;$('releaseType').value=m.releaseType;$('memoryDialog').showModal();
}

async function openDetail(id){
  const raw=memories.find(x=>x.id===id);if(!raw)return;
  const m=memoryView(raw);const f=await signedMedia(id);
  let media='<div class="detail-media"><span class="placeholder">✦</span></div>';
  if(f){
    if((f.mime_type||'').startsWith('image/')) media='<div class="detail-media"><img src="'+escapeHTML(f.url)+'" alt=""></div>';
    else if((f.mime_type||'').startsWith('video/')) media='<div class="detail-media"><video src="'+escapeHTML(f.url)+'" controls playsinline></video></div>';
    else if((f.mime_type||'').startsWith('audio/')) media='<div class="detail-media"><audio src="'+escapeHTML(f.url)+'" controls></audio></div>';
  }
  $('detailTitle').textContent=m.title;
  $('detailBody').innerHTML='<div class="detail-layout">'+media+'<div class="detail-copy"><div class="meta-row"><span class="pill">'+escapeHTML(m.dateCertainty)+'</span><span class="pill">'+escapeHTML(m.visibility)+'</span></div>'+
    '<p class="subtle">'+fmtDate(m.date)+' · '+escapeHTML(m.place||'Place not added')+'</p><p>'+escapeHTML(m.story||'No written story yet.').replace(/\n/g,'<br>')+'</p>'+
    '<p class="subtle">'+(m.people.length?'With '+escapeHTML(m.people.join(', ')):'No people added.')+'</p>'+
    '<div class="provenance"><p class="eyebrow">ORIGINAL / PROVENANCE</p><div class="prov-row"><b>Source</b><span>'+escapeHTML(m.source)+'</span></div>'+
    '<div class="prov-row"><b>Release</b><span>'+escapeHTML(m.releaseType)+(m.recipient?' · for '+escapeHTML(m.recipient):'')+'</span></div>'+
    (f?'<div class="prov-row"><b>'+escapeHTML(f.original_name)+'</b><span>'+escapeHTML(f.mime_type||'file')+(f.sha256?'<br><span class="hash">SHA-256 '+escapeHTML(f.sha256)+'</span>':'')+'</span></div>':'<div class="prov-row"><b>Media</b><span>No original file attached.</span></div>')+
    '</div><div class="dialog-actions"><button class="btn btn-soft" data-delete="'+m.id+'">Delete</button><button class="btn btn-primary" data-edit="'+m.id+'">Edit memory</button></div></div></div>';
  $('detailBody').querySelector('[data-edit]')?.addEventListener('click',()=>{$('detailDialog').close();openEdit(id)});
  $('detailBody').querySelector('[data-delete]')?.addEventListener('click',async()=>{if(!confirm('Delete this memory from your MIA archive?'))return;const {error}=await supabase.from('mia_memories').delete().eq('id',id);if(error){alert(error.message);return;}$('detailDialog').close();await refresh();toast('Memory deleted')});
  $('detailDialog').showModal();
}

async function uploadFiles(memoryId,fileList,sourceType){
  for(const file of [...fileList]){
    if(file.size>50*1024*1024) throw new Error(file.name+' is larger than the 50 MB upload limit.');
    const sha256=await hashFile(file);
    const safe=file.name.replace(/[^a-zA-Z0-9._-]+/g,'-').slice(-100)||'file';
    const path=ctx.user.id+'/'+archive.id+'/'+memoryId+'/'+uid()+'-'+safe;
    const {error:upError}=await supabase.storage.from('mia-originals').upload(path,file,{contentType:file.type||'application/octet-stream',upsert:false});
    if(upError) throw upError;
    const {error:metaError}=await supabase.from('mia_media_assets').insert({
      archive_id:archive.id,memory_id:memoryId,owner_user_id:ctx.user.id,storage_path:path,
      original_name:file.name,mime_type:file.type||'application/octet-stream',size_bytes:file.size,sha256,
      kind:'original',source_type:sourceType,status:'uploaded',metadata:{last_modified:file.lastModified||null}
    });
    if(metaError) throw metaError;
  }
}

async function saveForm(e){
  e.preventDefault();
  const existingId=$('memoryId').value||null;
  const payload={
    archive_id:archive.id,owner_user_id:ctx.user.id,title:$('title').value.trim(),story:$('story').value.trim()||null,
    memory_date:$('date').value||null,date_confidence:$('dateCertainty').value,
    people_names:$('people').value.split(',').map(x=>x.trim()).filter(Boolean),place_name:$('place').value.trim()||null,
    source_type:$('source').value,visibility:$('visibility').value,recipient_name:$('recipient').value.trim()||null,
    release_rule:$('releaseType').value,updated_at:new Date().toISOString()
  };
  let saved;
  if(existingId){
    const {data,error}=await supabase.from('mia_memories').update(payload).eq('id',existingId).select('*').single();
    if(error) throw error;saved=data;
  }else{
    const {data,error}=await supabase.from('mia_memories').insert(payload).select('*').single();
    if(error) throw error;saved=data;
  }
  if($('media').files.length){
    $('fileStatus').textContent='Hashing and preserving originals…';
    await uploadFiles(saved.id,$('media').files,payload.source_type);
  }
  $('memoryDialog').close();await refresh();toast(existingId?'Memory updated':'Memory preserved');
}

async function exportArchive(){
  const manifest={
    product:'MIA Memories',
    archive:{id:archive.id,title:archive.title,subtitle:archive.subtitle,exported_at:new Date().toISOString()},
    memories:memories.map(m=>({...m})),
    media:mediaAssets.map(a=>({id:a.id,memory_id:a.memory_id,original_name:a.original_name,mime_type:a.mime_type,size_bytes:a.size_bytes,sha256:a.sha256,source_type:a.source_type,created_at:a.created_at})),
    notice:'This manifest describes your archive. Original file export is handled separately so originals are not silently transformed.'
  };
  const blob=new Blob([JSON.stringify(manifest,null,2)],{type:'application/json'});
  const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='mia-archive-manifest-'+new Date().toISOString().slice(0,10)+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),3000);
  toast('Archive manifest exported');
}

async function refresh(){await loadWorkspace();await render()}

function setView(view){
  currentView=view;
  document.getElementById('mobileMoreSheet')?.setAttribute('hidden','');
  render();
  document.querySelectorAll('.mobile-nav').forEach(b=>b.classList.toggle('active',b.dataset.view===view));
}

document.querySelectorAll('.nav-item').forEach(b=>b.addEventListener('click',()=>setView(b.dataset.view)));
document.querySelectorAll('.mobile-nav[data-view]').forEach(b=>b.addEventListener('click',()=>setView(b.dataset.view)));
document.querySelectorAll('#mobileMoreSheet [data-view]').forEach(b=>b.addEventListener('click',()=>setView(b.dataset.view)));
$('addMemoryBtn').addEventListener('click',openAdd);
$('mobileAddBtn')?.addEventListener('click',openAdd);

const moreBtn=document.getElementById('mobileMoreBtn');
const moreSheet=document.getElementById('mobileMoreSheet');
moreBtn?.addEventListener('click',()=>{
  if(moreSheet?.hasAttribute('hidden')){
    moreSheet.removeAttribute('hidden');
    moreBtn.classList.add('active');
  }else{
    moreSheet?.setAttribute('hidden','');
    moreBtn.classList.remove('active');
  }
});

document.getElementById('mobileSignOut')?.addEventListener('click',async()=>{
  await supabase.auth.signOut();
  location.replace('./login.html');
});
$('exportBtn').addEventListener('click',exportArchive);
$('cancelDialog').addEventListener('click',()=>$('memoryDialog').close());
$('closeDetail').addEventListener('click',()=>$('detailDialog').close());
$('memoryForm').addEventListener('submit',e=>saveForm(e).catch(err=>{console.error(err);alert(err.message||'Could not save memory')}));
function mergeCapturedFiles(input){
  const main=$('media');
  if(!main || !input?.files?.length) return;
  const dt=new DataTransfer();
  [...main.files,...input.files].forEach(file=>dt.items.add(file));
  main.files=dt.files;
  main.dispatchEvent(new Event('change',{bubbles:true}));
  input.value='';
}

$('media').addEventListener('change',()=>{$('fileStatus').innerHTML=[...$('media').files].map(f=>'<span>'+escapeHTML(f.name)+' · '+(f.size/1024/1024).toFixed(2)+' MB · SHA-256 calculated on upload</span>').join('')});
['cameraCapture','videoCapture','audioCapture'].forEach(id=>{
  const input=$(id);
  input?.addEventListener('change',()=>mergeCapturedFiles(input));
});

(async()=>{
  try{
    ctx=await ready;
    if(!ctx)return;
    await refresh();
  }catch(err){
    console.error(err);
    document.documentElement.classList.add('mia-authorised');
    $('appView').innerHTML='<div class="sync-error"><strong>MIA could not open your archive.</strong><br>'+escapeHTML(err.message||String(err))+'</div>';
  }
})();