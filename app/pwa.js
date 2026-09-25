(()=>{
  const isStandalone=window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone===true;
  if(isStandalone) document.documentElement.classList.add("pwa-standalone");

  if("serviceWorker" in navigator){
    window.addEventListener("load",()=>navigator.serviceWorker.register("/app/sw.js",{scope:"/app/"}).catch(()=>{}));
  }

  let installPrompt=null;
  const installBtn=document.getElementById("installAppBtn");

  window.addEventListener("beforeinstallprompt",event=>{
    event.preventDefault();
    installPrompt=event;
    if(installBtn && !isStandalone) installBtn.hidden=false;
  });

  installBtn?.addEventListener("click",async()=>{
    if(!installPrompt) return;
    installPrompt.prompt();
    await installPrompt.userChoice.catch(()=>{});
    installPrompt=null;
    installBtn.hidden=true;
  });

  window.addEventListener("appinstalled",()=>{
    document.documentElement.classList.add("pwa-standalone");
    if(installBtn) installBtn.hidden=true;
  });
})();