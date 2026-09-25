module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const sessionId = String(req.query.session_id || '').trim();
  if (!/^cs_[A-Za-z0-9_]+$/.test(sessionId)) return res.status(400).json({ error: 'Invalid checkout reference' });
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return res.status(500).json({ error: 'Payment verification is not configured' });

  try {
    const r = await fetch('https://api.stripe.com/v1/checkout/sessions/' + encodeURIComponent(sessionId), {
      headers: { Authorization: 'Bearer ' + key }
    });
    const s = await r.json();
    if (!r.ok) return res.status(400).json({ verified: false });

    const service = s.metadata && s.metadata.service_type;
    const labels = {
      story_session: 'MIA Story Session',
      archive_rescue: 'MIA Archive Rescue',
      life_story: 'MIA Life Story'
    };
    const brandOk = !s.metadata?.brand || s.metadata.brand === 'mia_memories';
    const verified = brandOk && s.payment_status === 'paid' && !!labels[service];

    return res.status(200).json({
      verified,
      payment_status: s.payment_status,
      service_type: verified ? service : null,
      service_label: verified ? labels[service] : null,
      customer_name: verified ? (s.customer_details?.name || '') : '',
      amount_total: verified ? s.amount_total : null,
      currency: verified ? s.currency : null
    });
  } catch (e) {
    return res.status(500).json({ verified: false, error: 'Unable to verify payment' });
  }
};
