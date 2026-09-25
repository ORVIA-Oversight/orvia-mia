(()=> {
  const host=location.hostname.toLowerCase();
  const current=host.includes('voice')?'r':host.startsWith('threshold.')?'v':host.startsWith('mia.')?'i':host.startsWith('web.')?'a':'o';
  const landscape=`<div class="orvia-landscape"><div class="orvia-landscape__inner"><span class="orvia-landscape__label">ORVIA LANDSCAPE</span><nav class="orvia-landscape__nav" aria-label="ORVIA landscape"><a class="o" href="https://orvia.org.uk/"${current==='o'?' aria-current="page"':''}>Oversight</a><a class="r" href="https://orviavoice.co.uk/"${current==='r'?' aria-current="page"':''}>Voice</a><a class="v" href="https://threshold.orvia.org.uk/"${current==='v'?' aria-current="page"':''}>Threshold</a><a class="i" href="https://mia.orvia.org.uk/"${current==='i'?' aria-current="page"':''}>MIA</a><a class="a" href="https://web.orvia.org.uk/"${current==='a'?' aria-current="page"':''}>Web</a></nav></div></div>`;
  const contact=`<div class="orvia-contactbar"><div class="orvia-contactbar__inner"><a href="mailto:hello@orvia.org.uk">hello@orvia.org.uk</a><a href="tel:03300433703">0330 043 3703</a><span class="push">ORVIA Oversight Ltd · Human first. Evidence before assumption.</span></div></div>`;
  if(!document.querySelector('.orvia-contactbar')) document.body.insertAdjacentHTML('afterbegin',contact);
  if(!document.querySelector('.orvia-landscape')) {
    const bar=document.querySelector('.orvia-contactbar');
    if(bar) bar.insertAdjacentHTML('afterend',landscape); else document.body.insertAdjacentHTML('afterbegin',landscape);
  }
  const footer=`<footer class="orvia-common-footer">
    <div class="orvia-common-footer__inner">
      <div class="orvia-common-footer__brand"><a href="https://orvia.org.uk/"><img src="https://orvia.org.uk/assets/orvia-logo.png" alt="ORVIA Oversight"></a><p>One ORVIA landscape. Different services, one evidence-led standard.</p></div>
      <div><h4>ORVIA Landscape</h4><a href="https://orvia.org.uk/">Oversight</a><a href="https://orviavoice.co.uk/">Voice</a><a href="https://threshold.orvia.org.uk/">Threshold</a><a href="https://mia.orvia.org.uk/">MIA</a><a href="https://web.orvia.org.uk/">Web</a></div>
      <div><h4>Contact</h4><a href="tel:03300433703">0330 043 3703</a><a href="mailto:hello@orvia.org.uk">hello@orvia.org.uk</a><a href="https://orvia.org.uk/contact">Contact ORVIA</a><a href="https://orvia.org.uk/privacy">Privacy</a><a href="https://orvia.org.uk/accessibility">Accessibility</a></div>
    </div>
    <div class="orvia-common-footer__base"><span>ORVIA Oversight Ltd · Company No. 16123685 · ICO ZC152311</span><span class="push">Armed Forces Covenant · ERS Bronze</span></div>
  </footer>`;
  const oldFooter=document.querySelector('footer:not(.orvia-common-footer)');
  if(oldFooter) oldFooter.outerHTML=footer;
  else if(!document.querySelector('.orvia-common-footer')) document.body.insertAdjacentHTML('beforeend',footer);
})();