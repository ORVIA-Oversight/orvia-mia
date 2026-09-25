async function stripeSession(sessionId, key) {
  const r = await fetch('https://api.stripe.com/v1/checkout/sessions/' + encodeURIComponent(sessionId), {
    headers: { Authorization: 'Bearer ' + key }
  });
  const s = await r.json();
  if (!r.ok) throw new Error('Stripe session could not be verified');
  return s;
}

async function supabase(path, method, body) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase is not configured');
  const r = await fetch(url.replace(/\/$/, '') + '/rest/v1/' + path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'apikey': key,
      'Authorization': 'Bearer ' + key,
      'Prefer': 'return=representation,resolution=merge-duplicates'
    },
    body: body ? JSON.stringify(body) : undefined
  });
  const txt = await r.text();
  const data = txt ? JSON.parse(txt) : null;
  if (!r.ok) throw new Error('Database write failed');
  return data;
}

function bool(v) { return v === true; }
function clean(v, max=3000) { return typeof v === 'string' ? v.trim().slice(0, max) : ''; }
function list(v) { return Array.isArray(v) ? v.map(x => clean(x, 100)).filter(Boolean).slice(0, 30) : []; }

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const b = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    const sessionId = clean(b.session_id, 255);
    if (!/^cs_[A-Za-z0-9_]+$/.test(sessionId)) return res.status(400).json({ error: 'Invalid checkout reference' });

    const stripeKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeKey) return res.status(500).json({ error: 'Payment verification is not configured' });
    const s = await stripeSession(sessionId, stripeKey);

    const allowed = new Set(['story_session','archive_rescue','life_story']);
    const service = s.metadata?.service_type;
    const brandOk = !s.metadata?.brand || s.metadata.brand === 'mia_memories';
    if (!brandOk || s.payment_status !== 'paid' || !allowed.has(service)) {
      return res.status(403).json({ error: 'Paid MIA booking could not be verified' });
    }

    const email = (s.customer_details?.email || s.customer_email || '').toLowerCase();
    const name = s.customer_details?.name || '';
    if (!email) return res.status(400).json({ error: 'No customer email was available from checkout' });

    const orderRows = await supabase('mia_orders?on_conflict=stripe_checkout_session_id', 'POST', [{
      stripe_checkout_session_id: sessionId,
      stripe_payment_link_id: s.payment_link || null,
      stripe_customer_id: typeof s.customer === 'string' ? s.customer : null,
      customer_email: email,
      customer_name: name || null,
      service_type: service,
      amount_pence: s.amount_total || null,
      currency: s.currency || 'gbp',
      payment_status: 'paid',
      onboarding_status: 'submitted',
      campaign_source: s.metadata?.campaign_source || null,
      campaign_name: s.metadata?.campaign_name || null,
      landing_page: s.metadata?.landing_page || 'mia_services',
      updated_at: new Date().toISOString()
    }]);
    const orderId = orderRows?.[0]?.id || null;

    const onboardingRows = await supabase('mia_onboarding_submissions', 'POST', [{
      order_id: orderId,
      customer_email: email,
      customer_name: name || null,
      service_type: service,
      who_for: clean(b.who_for, 120) || null,
      preserve_types: list(b.preserve_types),
      material_types: list(b.material_types),
      contributors: list(b.contributors),
      privacy_boundaries: clean(b.privacy_boundaries, 3000) || null,
      recording_consent: false,
      ai_transcription_consent: bool(b.ai_transcription_consent),
      publicity_consent: bool(b.publicity_consent),
      future_presence_consent: bool(b.future_presence_consent),
      marketing_consent: bool(b.marketing_consent),
      current_step: 9,
      status: 'submitted',
      source: 'website',
      submitted_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }]);
    const onboardingId = onboardingRows?.[0]?.id || null;

    await supabase('mia_events', 'POST', [{
      order_id: orderId,
      onboarding_id: onboardingId,
      event_type: 'onboarding_submitted',
      detail: {
        source: 'website',
        service_type: service,
        early_start_requested: bool(b.early_start_requested),
        early_start_acknowledged: bool(b.early_start_acknowledged),
        payment_verified: true
      }
    }]);

    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'We could not save your onboarding. Please contact MIA.' });
  }
};
