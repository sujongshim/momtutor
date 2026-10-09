// 단어 시험 결과를 구글 시트(Apps Script 웹앱)로 전달한다. 주소와 비밀문구는 Vercel 환경변수에만 있다.
const ALLOWED = /(^|\.)momtutor\.vercel\.app$/;

function clean(b) {
  const str = (v, n) => String(v == null ? '' : v).replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, n);
  const num = (v, lo, hi) => {
    const x = Math.round(Number(v));
    return Number.isFinite(x) && x >= lo && x <= hi ? x : null;
  };
  const score = num(b.score, 0, 500), total = num(b.total, 1, 500);
  if (score === null || total === null || score > total) return null;
  const name = str(b.name, 30);
  if (!name) return null;
  const wrong = Array.isArray(b.wrong) ? b.wrong.slice(0, 200).map((w) => str(w, 60)).filter(Boolean) : [];
  return { name, round: str(b.round, 40), range: str(b.range, 40), score, total, percent: Math.round((score / total) * 100), wrong };
}

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ ok: false });
  let host = '';
  try { host = new URL(req.headers.origin || '').hostname; } catch (e) {}
  if (!ALLOWED.test(host) && host !== 'localhost') return res.status(403).json({ ok: false });
  const url = process.env.SHEET_WEBHOOK_URL, secret = process.env.SHEET_SECRET;
  if (!url || !secret) return res.status(503).json({ ok: false, error: 'not_configured' });
  const data = clean(req.body || {});
  if (!data) return res.status(400).json({ ok: false, error: 'bad_request' });
  try {
    const r = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ secret, ...data }),
      redirect: 'follow',
    });
    const j = await r.json().catch(() => ({}));
    return res.status(j.ok ? 200 : 502).json({ ok: !!j.ok });
  } catch (e) {
    return res.status(502).json({ ok: false });
  }
};
