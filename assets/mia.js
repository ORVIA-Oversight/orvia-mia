document.addEventListener('DOMContentLoaded',()=>{

  /* ORVIA Oversight slim utility bar */
  if(!document.querySelector('.orvia-utility-bar')){
    const utility=document.createElement('div');
    utility.className='orvia-utility-bar';
    utility.innerHTML=`
      <div class="orvia-utility-wrap">
        <div class="orvia-utility-left">
          <a href="mailto:hello@orvia.org.uk">hello@orvia.org.uk</a>
          <a href="tel:03300433703">0330 043 3703</a>
        </div>
        <div class="orvia-utility-right">
          <a href="https://orvia.org.uk/customer-access">Customer Access</a>
          <a href="https://orvia.org.uk/voice">ORVIA Voice</a>
        </div>
      </div>`;
    document.body.insertBefore(utility,document.body.firstChild);
  }

  /* ORVIA Oversight corporate footer */
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