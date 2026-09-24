(() => {
  const DB_NAME = "mia-memories-local";
  const DB_VERSION = 2;
  const STORE_MEMORIES = "memories";
  const STORE_FILES = "files";
  const STORE_AUDIT = "audit";
  let db;
  let currentView = "home";

  const $ = (id) => document.getElementById(id);
  const escapeHTML = (value = "") => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
  const fmtDate = value => value ? new Intl.DateTimeFormat("en-GB",{day:"numeric",month:"short",year:"numeric"}).format(new Date(value+"T12:00:00")) : "Date unknown";
  const uid = () => crypto.randomUUID ? crypto.randomUUID() : "m-"+Date.now()+"-"+Math.random().toString(16).slice(2);

  async function openDB(){
    return new Promise((resolve,reject)=>{
      const req=indexedDB.open(DB_NAME,DB_VERSION);
      req.onupgradeneeded=()=>{
        const d=req.result;
        if(!d.objectStoreNames.contains(STORE_MEMORIES)){
          const s=d.createObjectStore(STORE_MEMORIES,{keyPath:"id"});
          s.createIndex("date","date");
          s.createIndex("createdAt","createdAt");
        }
        if(!d.objectStoreNames.contains(STORE_FILES)){
          d.createObjectStore(STORE_FILES,{keyPath:"id"});
        }
        if(!d.objectStoreNames.contains(STORE_AUDIT)){
          const a=d.createObjectStore(STORE_AUDIT,{keyPath:"id"});
          a.createIndex("createdAt","createdAt");
        }
      };
      req.onsuccess=()=>resolve(req.result);
      req.onerror=()=>reject(req.error);
    });
  }
  const txStore=(name,mode="readonly")=>db.transaction(name,mode).objectStore(name);
  const reqP=req=>new Promise((res,rej)=>{req.onsuccess=()=>res(req.result);req.onerror=()=>rej(req.error)});
  const allMemories=async()=>reqP(txStore(STORE_MEMORIES).getAll());
  const getMemory=async id=>reqP(txStore(STORE_MEMORIES).get(id));
  const getFile=async id=>reqP(txStore(STORE_FILES).get(id));
  const putMemory=async item=>reqP(txStore(STORE_MEMORIES,"readwrite").put(item));
  const putFile=async item=>reqP(txStore(STORE_FILES,"readwrite").put(item));
  const putAudit=async item=>reqP(txStore(STORE_AUDIT,"readwrite").put(item));
  const allAudit=async()=>reqP(txStore(STORE_AUDIT).getAll());
  const deleteMemory=async id=>{
    const memory=await getMemory(id);
    if(memory?.mediaIds?.length){
      const t=db.transaction(STORE_FILES,"readwrite").objectStore(STORE_FILES);
      memory.mediaIds.forEach(fid=>t.delete(fid));
    }
    await reqP(txStore(STORE_MEMORIES,"readwrite").delete(id));
    await putAudit({id:uid(),action:"DELETE",memoryId:id,title:memory?.title||"",createdAt:new Date().toISOString()});
  };

  async function hashBlob(blob){
    const buf=await blob.arrayBuffer();
    const hash=await crypto.subtle.digest("SHA-256",buf);
    return [...new Uint8Array(hash)].map(b=>b.toString(16).padStart(2,"0")).join("");
  }
  async function storeUploads(fileList){
    const ids=[];
    for(const file of [...fileList]){
      const id=uid();
      const hash=await hashBlob(file);
      const record={
        id,name:file.name,type:file.type || "application/octet-stream",size:file.size,
        lastModified:file.lastModified,sha256:hash,blob:file,importedAt:new Date().toISOString()
      };
      await putFile(record); ids.push(id);
    }
    return ids;
  }
  function toast(message){
    const d=document.createElement("div");d.className="toast";d.textContent=message;document.body.appendChild(d);
    setTimeout(()=>d.remove(),2400);
  }
  function initials(name){return (name||"?").split(/\s+/).slice(0,2).map(x=>x[0]?.toUpperCase()).join("")}

  async function seed(){
    const existing=await allMemories(); if(existing.length) return;
    const now=new Date().toISOString();
    const examples=[
      {id:uid(),title:"A first memory",date:"2018-07-18",dateCertainty:"USER SUPPLIED",story:"A small example to show how MIA keeps the story around a memory. Replace or delete this and add your own.",people:["Sophie","Dad"],place:"The beach",source:"Uploaded manually",visibility:"PRIVATE",recipient:"",releaseType:"Available now",mediaIds:[],createdAt:now,updatedAt:now,synthetic:true},
      {id:uid(),title:"A story for later",date:"2026-09-24",dateCertainty:"USER SUPPLIED",story:"Some words belong to another day. MIA can preserve them now and keep the release instruction beside the original story.",people:["Family"],place:"Home",source:"Uploaded manually",visibility:"LOCKED UNTIL",recipient:"My family",releaseType:"When I approve",mediaIds:[],createdAt:now,updatedAt:now,synthetic:true}
    ];
    for(const m of examples) await putMemory(m);
  }

  async function firstMedia(memory){
    if(!memory?.mediaIds?.length) return null;
    return getFile(memory.mediaIds[0]);
  }
  async function mediaHTML(memory, cls="memory-media"){
    const f=await firstMedia(memory);
    if(!f) return `<div class="${cls}"><span class="placeholder">✦</span></div>`;
    const url=URL.createObjectURL(f.blob);
    if(f.type.startsWith("image/")) return `<div class="${cls}"><img src="${url}" alt=""></div>`;
    if(f.type.startsWith("video/")) return `<div class="${cls}"><video src="${url}" muted playsinline></video></div>`;
    if(f.type.startsWith("audio/")) return `<div class="${cls}"><span class="placeholder">♪</span></div>`;
    return `<div class="${cls}"><span class="placeholder">▤</span></div>`;
  }
  function certaintyClass(v){return v==="VERIFIED"||v==="SUPPORTED"?"verified":v==="INFERRED"?"inferred":""}
  async function memoryCard(m){
    return `<article class="memory-card">
      ${await mediaHTML(m)}
      <div class="memory-copy">
        <div class="subtle">${fmtDate(m.date)} · ${escapeHTML(m.place||"Place not added")}</div>
        <h3>${escapeHTML(m.title)}</h3>
        <p>${escapeHTML(m.story||"No story added yet.")}</p>
        <div class="meta-row">
          <span class="pill ${certaintyClass(m.dateCertainty)}">${escapeHTML(m.dateCertainty||"UNKNOWN")}</span>
          <span class="pill">${escapeHTML(m.visibility||"PRIVATE")}</span>
        </div>
        <div class="card-actions"><span class="subtle">${m.people?.length?escapeHTML(m.people.join(" · ")):"People not added"}</span><button class="link-btn" data-open="${m.id}">Open memory →</button></div>
      </div>
    </article>`;
  }
  async function renderHome(memories){
    const people=new Set(memories.flatMap(m=>m.people||[]));
    const places=new Set(memories.map(m=>m.place).filter(Boolean));
    const later=memories.filter(m=>m.releaseType && m.releaseType!=="Available now" && m.releaseType!=="Private");
    const recent=[...memories].sort((a,b)=>(b.updatedAt||"").localeCompare(a.updatedAt||"")).slice(0,3);
    const recentCards=(await Promise.all(recent.map(memoryCard))).join("");
    return `<div class="hero-grid">
      <section class="story-card">
        <div><p class="eyebrow">YOUR LIFE · YOUR PEOPLE · YOUR STORY</p><h2>${memories.length ? "Your memories, with the meaning kept around them." : "Start with one memory."}</h2>
        <p>MIA keeps the photograph, place, people, date, voice, story, context and original source together — while keeping provenance quietly behind the human experience.</p></div>
        <div><button class="btn btn-primary" id="heroAdd">Preserve a memory</button></div>
      </section>
      <div class="stats">
        <div class="metric-card"><strong>${memories.length}</strong><span>memories preserved</span></div>
        <div class="metric-card"><strong>${people.size}</strong><span>people connected</span></div>
        <div class="metric-card"><strong>${places.size}</strong><span>places remembered</span></div>
        <div class="metric-card"><strong>${later.length}</strong><span>for later</span></div>
      </div>
    </div>
    <div class="section-head"><div><p class="eyebrow">CONTINUE YOUR STORY</p><h2>Recent memories</h2></div><p>Originals remain behind each memory.</p></div>
    ${recent.length?`<div class="memory-grid">${recentCards}</div>`:`<div class="empty"><h3>Nothing here yet</h3><p>Add a photograph, voice note, video or story to begin.</p></div>`}`;
  }
  async function renderMemories(memories){
    const cards=(await Promise.all([...memories].sort((a,b)=>(b.date||"").localeCompare(a.date||"")).map(memoryCard))).join("");
    return `<div class="section-head"><div><p class="eyebrow">MEMORY OBJECTS</p><h2>All memories</h2></div><p>${memories.length} items</p></div>
    ${cards?`<div class="memory-grid">${cards}</div>`:`<div class="empty"><h3>No memories yet</h3><p>Preserve your first one.</p></div>`}`;
  }
  function renderTimeline(memories){
    const groups={};
    memories.forEach(m=>{const y=m.date?m.date.slice(0,4):"Unknown";(groups[y]??=[]).push(m)});
    const years=Object.keys(groups).sort((a,b)=>b.localeCompare(a));
    if(!years.length) return `<div class="empty"><h3>Your timeline will grow here</h3></div>`;
    return `<div class="timeline">${years.map(y=>`<section class="year-group"><div class="year-label">${escapeHTML(y)}</div><div class="timeline-items">${groups[y].sort((a,b)=>(b.date||"").localeCompare(a.date||"")).map(m=>`<button class="timeline-item" data-open="${m.id}" style="width:100%;border:1px solid var(--line);text-align:left;color:inherit"><time>${fmtDate(m.date)}</time><b>${escapeHTML(m.title)}</b><span class="subtle">${escapeHTML(m.place||"")}</span></button>`).join("")}</div></section>`).join("")}</div>`;
  }
  function renderPeople(memories){
    const map=new Map();
    memories.forEach(m=>(m.people||[]).forEach(p=>{if(!map.has(p))map.set(p,[]);map.get(p).push(m)}));
    const rows=[...map.entries()].sort((a,b)=>a[0].localeCompare(b[0]));
    return rows.length?`<div class="section-head"><div><p class="eyebrow">PEOPLE</p><h2>The people in your story</h2></div></div><div class="people-grid">${rows.map(([p,ms])=>`<div class="person-card"><div class="avatar">${escapeHTML(initials(p))}</div><h3>${escapeHTML(p)}</h3><div class="subtle">${ms.length} memor${ms.length===1?"y":"ies"} · ${new Set(ms.map(x=>x.place).filter(Boolean)).size} places</div></div>`).join("")}</div>`:`<div class="empty"><h3>No people added yet</h3><p>Add names to memories and MIA will bring their story together.</p></div>`;
  }
  function renderPlaces(memories){
    const map=new Map();
    memories.filter(m=>m.place).forEach(m=>{if(!map.has(m.place))map.set(m.place,[]);map.get(m.place).push(m)});
    const rows=[...map.entries()];
    return rows.length?`<div class="section-head"><div><p class="eyebrow">PLACES</p><h2>Where your story happened</h2></div><p>Map coordinates are not inferred in this MVP.</p></div><div class="place-grid">${rows.map(([p,ms])=>`<div class="place-card"><p class="eyebrow">PLACE · USER SUPPLIED</p><h3>⌖ ${escapeHTML(p)}</h3><div class="subtle">${ms.length} memor${ms.length===1?"y":"ies"} here</div></div>`).join("")}</div>`:`<div class="empty"><h3>No places added yet</h3></div>`;
  }
  function renderLater(memories){
    const rows=memories.filter(m=>m.releaseType && !["Available now","Private"].includes(m.releaseType));
    return rows.length?`<div class="section-head"><div><p class="eyebrow">FOR LATER</p><h2>Memories with release instructions</h2></div><p>Release decisions are not automated in this MVP.</p></div><div class="later-grid">${rows.map(m=>`<button class="later-card" data-open="${m.id}" style="text-align:left;color:inherit"><p class="eyebrow">${escapeHTML(m.releaseType)}</p><h3>${escapeHTML(m.title)}</h3><div class="subtle">For ${escapeHTML(m.recipient||"a future recipient")} · ${escapeHTML(m.visibility)}</div></button>`).join("")}</div>`:`<div class="empty"><h3>No Letters or Memories for Later yet</h3><p>Create a memory and choose a future release instruction.</p></div>`;
  }
  function renderImport(){
    return `<div class="import-panel">
      <section class="panel"><p class="eyebrow">MVP IMPORT</p><h2>Bring in memories without changing the originals.</h2><p class="subtle">Direct file upload is working now. ZIP and platform-specific importers are staged for the next build.</p>
        <div class="import-options">
          <button class="import-option" id="directImport"><span><b>Direct upload</b><small>Photo · video · voice · document</small></span><span>Working →</span></button>
          <div class="import-option"><span><b>ZIP archive</b><small>Basic bulk ZIP import</small></span><span class="pill">NEXT</span></div>
          <div class="import-option"><span><b>Google Photos Takeout</b><small>Originals + JSON sidecars</small></span><span class="pill">PHASE 2</span></div>
          <div class="import-option"><span><b>Facebook archive</b><small>Posts + media + selected context</small></span><span class="pill">PHASE 2</span></div>
        </div>
      </section>
      <section class="panel"><p class="eyebrow">PROVENANCE</p><h2>What MIA preserves now</h2><table class="audit-table">
        <tr><th>Field</th><th>Status</th></tr>
        <tr><td>Original file bytes</td><td>Stored in browser IndexedDB</td></tr>
        <tr><td>Original filename/type/size</td><td>Recorded</td></tr>
        <tr><td>SHA-256</td><td>Calculated on import</td></tr>
        <tr><td>Import timestamp</td><td>Recorded</td></tr>
        <tr><td>Date certainty</td><td>Explicit label</td></tr>
        <tr><td>GPS / EXIF extraction</td><td>Not yet connected</td></tr>
        <tr><td>Archive export</td><td>Manifest + original binaries + audit trail</td></tr>
      </table></section>
    </div>`;
  }

  async function render(){
    const memories=await allMemories();
    const titles={home:"Your story",timeline:"Timeline",memories:"Memories",people:"People",places:"Places",later:"For later",import:"Import memories"};
    $("viewTitle").textContent=titles[currentView];
    document.querySelectorAll(".nav-item").forEach(b=>b.classList.toggle("active",b.dataset.view===currentView));
    let html="";
    if(currentView==="home") html=await renderHome(memories);
    else if(currentView==="memories") html=await renderMemories(memories);
    else if(currentView==="timeline") html=renderTimeline(memories);
    else if(currentView==="people") html=renderPeople(memories);
    else if(currentView==="places") html=renderPlaces(memories);
    else if(currentView==="later") html=renderLater(memories);
    else html=renderImport();
    $("appView").innerHTML=html;
    bindDynamic();
  }
  function bindDynamic(){
    document.querySelectorAll("[data-open]").forEach(b=>b.addEventListener("click",()=>openDetail(b.dataset.open)));
    $("heroAdd")?.addEventListener("click",openAdd);
    $("directImport")?.addEventListener("click",openAdd);
  }
  function resetForm(){
    $("memoryForm").reset(); $("memoryId").value=""; $("dateCertainty").value="USER SUPPLIED"; $("visibility").value="PRIVATE"; $("releaseType").value="Available now"; $("fileStatus").innerHTML="";
  }
  function openAdd(){resetForm();$("dialogTitle").textContent="Add a memory";$("memoryDialog").showModal()}
  async function openEdit(id){
    const m=await getMemory(id); if(!m)return;
    resetForm();$("dialogTitle").textContent="Edit memory";$("memoryId").value=m.id;$("title").value=m.title||"";$("date").value=m.date||"";$("dateCertainty").value=m.dateCertainty||"USER SUPPLIED";$("story").value=m.story||"";$("people").value=(m.people||[]).join(", ");$("place").value=m.place||"";$("source").value=m.source||"Uploaded manually";$("visibility").value=m.visibility||"PRIVATE";$("recipient").value=m.recipient||"";$("releaseType").value=m.releaseType||"Available now";$("memoryDialog").showModal();
  }
  async function openDetail(id){
    const m=await getMemory(id); if(!m)return;
    const files=await Promise.all((m.mediaIds||[]).map(getFile));
    let media=`<div class="detail-media"><span class="placeholder">✦</span></div>`;
    if(files[0]){
      const f=files[0],u=URL.createObjectURL(f.blob);
      media=f.type.startsWith("image/")?`<div class="detail-media"><img src="${u}" alt=""></div>`:f.type.startsWith("video/")?`<div class="detail-media"><video src="${u}" controls playsinline></video></div>`:`<div class="detail-media"><span class="placeholder">${f.type.startsWith("audio/")?"♪":"▤"}</span></div>`;
    }
    $("detailTitle").textContent=m.title;
    $("detailBody").innerHTML=`<div class="detail-layout">${media}<div class="detail-copy">
      <div class="meta-row"><span class="pill ${certaintyClass(m.dateCertainty)}">${escapeHTML(m.dateCertainty)}</span><span class="pill">${escapeHTML(m.visibility)}</span>${m.synthetic?'<span class="pill">SYNTHETIC DEMO</span>':""}</div>
      <p class="subtle">${fmtDate(m.date)} · ${escapeHTML(m.place||"Place not added")}</p>
      <p>${escapeHTML(m.story||"No written story yet.").replace(/\n/g,"<br>")}</p>
      <p class="subtle">${m.people?.length?"With "+escapeHTML(m.people.join(", ")):"No people added."}</p>
      <div class="provenance"><p class="eyebrow">ORIGINAL / PROVENANCE</p>
        <div class="prov-row"><b>Source</b><span>${escapeHTML(m.source||"Unknown")}</span></div>
        <div class="prov-row"><b>Date status</b><span>${escapeHTML(m.dateCertainty||"UNKNOWN")}</span></div>
        <div class="prov-row"><b>Release</b><span>${escapeHTML(m.releaseType||"Private")}${m.recipient?" · for "+escapeHTML(m.recipient):""}</span></div>
        ${files.map(f=>`<div class="prov-row"><b>${escapeHTML(f.name)}</b><span><span>${(f.size/1024/1024).toFixed(2)} MB · ${escapeHTML(f.type)}</span><br><span class="hash">SHA-256 ${f.sha256}</span></span></div>`).join("")}
        ${files.length?"":'<div class="prov-row"><b>Media</b><span>No original file attached to this memory.</span></div>'}
      </div>
      <div class="dialog-actions"><button class="btn btn-soft" data-delete="${m.id}">Delete</button><button class="btn btn-primary" data-edit="${m.id}">Edit memory</button></div>
    </div></div>`;
    $("detailBody").querySelector("[data-edit]")?.addEventListener("click",()=>{$("detailDialog").close();openEdit(id)});
    $("detailBody").querySelector("[data-delete]")?.addEventListener("click",async()=>{if(confirm("Delete this memory from this local prototype?")){await deleteMemory(id);$("detailDialog").close();render();toast("Memory deleted")}}); 
    $("detailDialog").showModal();
  }
  async function saveForm(e){
    e.preventDefault();
    const id=$("memoryId").value||uid();
    const existing=$("memoryId").value?await getMemory(id):null;
    let mediaIds=existing?.mediaIds||[];
    if($("media").files.length){
      $("fileStatus").textContent="Hashing and preserving originals…";
      mediaIds=[...mediaIds,...await storeUploads($("media").files)];
    }
    const now=new Date().toISOString();
    const record={
      id,title:$("title").value.trim(),date:$("date").value,dateCertainty:$("dateCertainty").value,
      story:$("story").value.trim(),people:$("people").value.split(",").map(x=>x.trim()).filter(Boolean),
      place:$("place").value.trim(),source:$("source").value,visibility:$("visibility").value,
      recipient:$("recipient").value.trim(),releaseType:$("releaseType").value,mediaIds,
      createdAt:existing?.createdAt||now,updatedAt:now,synthetic:false
    };
    await putMemory(record);
    await putAudit({id:uid(),action:existing?"UPDATE":"CREATE",memoryId:id,title:record.title,createdAt:now});
    $("memoryDialog").close();await render();toast(existing?"Memory updated":"Memory preserved");
  }
  function safeTarName(value){
    return String(value||"file").normalize("NFKD").replace(/[^a-zA-Z0-9._/-]+/g,"_").replace(/^\/+|\/+$/g,"").slice(-96) || "file";
  }
  function writeTarText(buf,offset,length,value){
    const bytes=new TextEncoder().encode(String(value));
    buf.set(bytes.slice(0,length),offset);
  }
  function writeTarOctal(buf,offset,length,value){
    const out=Math.max(0,Number(value)||0).toString(8).padStart(length-1,"0").slice(-(length-1))+"\0";
    writeTarText(buf,offset,length,out);
  }
  function tarHeader(name,size,mtime){
    const h=new Uint8Array(512);
    writeTarText(h,0,100,name);
    writeTarOctal(h,100,8,0o644); writeTarOctal(h,108,8,0); writeTarOctal(h,116,8,0);
    writeTarOctal(h,124,12,size); writeTarOctal(h,136,12,Math.floor((mtime||Date.now())/1000));
    for(let i=148;i<156;i++) h[i]=32;
    h[156]="0".charCodeAt(0); writeTarText(h,257,6,"ustar"); writeTarText(h,263,2,"00");
    let sum=0; for(const b of h) sum+=b;
    const check=sum.toString(8).padStart(6,"0").slice(-6)+"\0 ";
    writeTarText(h,148,8,check);
    return h;
  }
  async function makeTar(entries){
    const chunks=[];
    for(const entry of entries){
      const bytes=entry.data instanceof Uint8Array?entry.data:new Uint8Array(await entry.data.arrayBuffer());
      chunks.push(tarHeader(entry.name,bytes.length,entry.mtime));
      chunks.push(bytes);
      const pad=(512-(bytes.length%512))%512;
      if(pad) chunks.push(new Uint8Array(pad));
    }
    chunks.push(new Uint8Array(1024));
    return new Blob(chunks,{type:"application/x-tar"});
  }
  async function exportArchive(){
    const memories=await allMemories();
    const audit=(await allAudit()).sort((a,b)=>(a.createdAt||"").localeCompare(b.createdAt||""));
    const manifest={
      product:"MIA Memories",
      formatVersion:"0.2-local-mvp",
      exportedAt:new Date().toISOString(),
      notice:"Archive contains a JSON manifest, audit trail and original uploaded binaries. Synthetic demonstration memories are explicitly labelled.",
      memories:[],
      audit
    };
    const entries=[];
    for(const m of memories){
      const files=await Promise.all((m.mediaIds||[]).map(getFile));
      manifest.memories.push({...m,mediaIds:undefined,files:files.filter(Boolean).map(f=>({id:f.id,name:f.name,type:f.type,size:f.size,lastModified:f.lastModified,sha256:f.sha256,importedAt:f.importedAt}))});
      files.filter(Boolean).forEach((f,i)=>{
        entries.push({name:safeTarName(`originals/${m.id}/${String(i+1).padStart(2,"0")}-${f.name}`),data:f.blob,mtime:f.lastModified||Date.now()});
      });
    }
    const manifestBytes=new TextEncoder().encode(JSON.stringify(manifest,null,2));
    entries.unshift({name:"mia-manifest.json",data:manifestBytes,mtime:Date.now()});
    const blob=await makeTar(entries);
    const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=`mia-memories-archive-${new Date().toISOString().slice(0,10)}.tar`;a.click();
    setTimeout(()=>URL.revokeObjectURL(a.href),5000);
    toast("Archive exported with originals");
  }

  document.querySelectorAll(".nav-item").forEach(b=>b.addEventListener("click",()=>{currentView=b.dataset.view;render()}));
  $("addMemoryBtn").addEventListener("click",openAdd);
  $("exportBtn").addEventListener("click",exportArchive);
  $("cancelDialog").addEventListener("click",()=>$("memoryDialog").close());
  $("closeDetail").addEventListener("click",()=>$("detailDialog").close());
  $("memoryForm").addEventListener("submit",saveForm);
  $("media").addEventListener("change",async()=>{
    const files=[...$("media").files];
    $("fileStatus").innerHTML=files.map(f=>`<span>${escapeHTML(f.name)} · ${(f.size/1024/1024).toFixed(2)} MB · SHA-256 calculated on save</span>`).join("");
  });

  (async()=>{db=await openDB();await seed();await render()})().catch(err=>{
    console.error(err);$("appView").innerHTML=`<div class="empty"><h3>MIA could not open local storage</h3><p>${escapeHTML(err.message||String(err))}</p></div>`;
  });
})();