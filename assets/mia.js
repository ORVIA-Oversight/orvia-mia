
document.addEventListener('DOMContentLoaded',()=>{
 const b=document.querySelector('.menu'); const nav=document.querySelector('.navlinks');
 if(b&&nav){b.addEventListener('click',()=>{const open=nav.style.display==='flex';nav.style.display=open?'none':'flex';if(!open){Object.assign(nav.style,{position:'absolute',left:'14px',right:'14px',top:'72px',background:'#fff9ef',padding:'20px',border:'1px solid rgba(8,38,83,.13)',borderRadius:'16px',flexDirection:'column',alignItems:'stretch',boxShadow:'0 20px 55px rgba(8,38,83,.12)'})}})}
});
