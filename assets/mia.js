document.addEventListener('DOMContentLoaded',()=>{

  /* ORVIA Oversight corporate frame */
  if(!document.querySelector('.orvia-parent-header')){
    const corporateHeader=document.createElement('div');
    corporateHeader.className='orvia-parent-header';
    corporateHeader.innerHTML=`
      <div class="orvia-parent-wrap orvia-parent-nav">
        <a class="orvia-parent-brand" href="https://orvia.org.uk/" aria-label="ORVIA Oversight home">
          <img src="https://orvia.org.uk/assets/orvia-logo.png" alt="ORVIA Oversight">
        </a>
        <button class="orvia-parent-menu" type="button" aria-label="Open ORVIA navigation" aria-expanded="false">☰</button>
        <nav class="orvia-parent-links" aria-label="ORVIA Oversight navigation">
          <a href="https://orvia.org.uk/why-orvia">Why ORVIA</a>
          <a href="https://orvia.org.uk/#routes">Who We Help</a>
          <a href="https://orvia.org.uk/#services">Services</a>
          <a href="https://orvia.org.uk/vita">ORVIA Method</a>
          <a href="https://orvia.org.uk/voice">Voice</a>
        </nav>
        <div class="orvia-parent-actions">
          <a class="orvia-btn orvia-btn-outline" href="https://orvia.org.uk/customer-access">Customer Access</a>
          <a class="orvia-btn orvia-btn-primary" href="https://orvia.org.uk/contact#book">Talk to ORVIA</a>
        </div>
      </div>`;
    document.body.insertBefore(corporateHeader,document.body.firstChild);

    const corporateMenu=corporateHeader.querySelector('.orvia-parent-menu');
    if(corporateMenu){
      corporateMenu.addEventListener('click',()=>{
        const open=corporateHeader.classList.toggle('open');
        corporateMenu.setAttribute('aria-expanded',String(open));
      });
    }
  }

  if(!document.querySelector('.orvia-parent-footer')){
    const corporateFooter=document.createElement('footer');
    corporateFooter.className='orvia-parent-footer';
    corporateFooter.innerHTML=`
      <div class="orvia-parent-wrap">
        <div class="orvia-footer-main">
          <div class="orvia-footer-brand">
            <img src="https://orvia.org.uk/assets/orvia-logo.png" alt="ORVIA Oversight">
            <p><strong>See. Understand. Protect.</strong><br>Independent oversight, evidence and practical improvement with people kept at the centre.</p>
          </div>
          <div>
            <h4>START HERE</h4>
            <a href="https://orvia.org.uk/why-orvia">Why ORVIA</a>
            <a href="https://orvia.org.uk/#routes">Who We Help</a>
            <a href="https://orvia.org.uk/#services">Services</a>
            <a href="https://orvia.org.uk/contact">Contact</a>
          </div>
          <div>
            <h4>METHOD + PRODUCTS</h4>
            <a href="https://orvia.org.uk/vita">ORVIA Method</a>
            <a href="https://orvia.org.uk/voice">ORVIA Voice</a>
            <a href="https://orvia.org.uk/customer-access">Customer Access</a>
          </div>
          <div>
            <h4>COMPANY</h4>
            <a href="https://orvia.org.uk/about">About</a>
            <a href="https://orvia.org.uk/work-with-john">Work with John</a>
            <a href="https://orvia.org.uk/insights">Insights</a>
            <a href="tel:03300433703">0330 043 3703</a>
            <a href="mailto:hello@orvia.org.uk">hello@orvia.org.uk</a>
          </div>
          <div class="orvia-footer-signature">
            <strong>People first.<br>A safer tomorrow.</strong>
            <span></span>
            <div class="orvia-footer-social">
              <a href="https://www.linkedin.com/company/orvia-oversight/" aria-label="LinkedIn">in</a>
              <a href="mailto:hello@orvia.org.uk" aria-label="Email">@</a>
              <a href="tel:03300433703" aria-label="Telephone">☎</a>
            </div>
          </div>
        </div>
        <div class="orvia-footer-legal">
          <span>© 2026 ORVIA Oversight Ltd</span>
          <span>Company 16123685</span>
          <span>ICO ZC152311</span>
          <span class="push">
            <a href="https://orvia.org.uk/privacy">Privacy</a>
            <a href="https://orvia.org.uk/terms">Terms</a>
            <a href="https://orvia.org.uk/cookies">Cookies</a>
            <a href="https://orvia.org.uk/accessibility">Accessibility</a>
            <a href="https://orvia.org.uk/sitemap.xml">Sitemap</a>
          </span>
        </div>
      </div>`;
    document.body.appendChild(corporateFooter);
  }

  const header=document.querySelector('.site-header');
  const menu=document.querySelector('.menu');
  if(menu&&header){
    menu.addEventListener('click',()=>{
      const open=header.classList.toggle('open');
      menu.setAttribute('aria-expanded',String(open));
    });
  }
});