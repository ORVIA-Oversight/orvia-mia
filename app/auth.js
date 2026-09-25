import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';
const supabase=createClient('https://qokkyynptzeuuebykmbo.supabase.co','sb_publishable_4EaQGyC5dYqhCIiAPcymVg_SIouLR5h');

async function ensureAccess(userId){
  let {data:ent,error}=await supabase.from('hub_service_access')
    .select('service_code,service_label,status,metadata')
    .eq('user_id',userId).eq('service_code','mia').eq('status','active').maybeSingle();
  if(!error && ent) return ent;

  const activated=await supabase.functions.invoke('mia-access',{body:{}});
  if(activated.error || !activated.data?.active) return null;

  const retry=await supabase.from('hub_service_access')
    .select('service_code,service_label,status,metadata')
    .eq('user_id',userId).eq('service_code','mia').eq('status','active').maybeSingle();
  return retry.data||null;
}

async function guard(){
  const {data:{session}}=await supabase.auth.getSession();
  if(!session){ location.replace('./login.html'); return null; }
  const ent=await ensureAccess(session.user.id);
  if(!ent){ await supabase.auth.signOut(); location.replace('./login.html?access=missing'); return null; }
  document.documentElement.classList.add('mia-authorised');
  const email=document.getElementById('accountEmail'); if(email) email.textContent=session.user.email||'MIA customer';
  const logout=document.getElementById('logoutBtn');
  if(logout) logout.addEventListener('click',async()=>{await supabase.auth.signOut();location.replace('./login.html')});
  return {session,user:session.user,entitlement:ent};
}

const ready=guard();
export { supabase, ready };