export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ error: 'Use POST for preparation requests.' });
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return res.status(503).json({ error: 'AI is not configured yet. Add GROQ_API_KEY in Vercel → Settings → Environment Variables, then redeploy.' });
  try {
    const { kind, motion, side = 'Neutral', format = 'General school debate', level = 'balanced', country, committee, agenda, delegations, title } = req.body || {};
    let system, prompt;
    if (kind === 'mun') {
      if (!country || !committee || !agenda) return res.status(400).json({ error: 'Add your country, committee, and agenda first.' });
      system = `You are DEBATRIX, a careful Model UN preparation coach. Help the student understand and develop their own diplomacy strategy, not blindly copy a speech. Never invent facts, quotes, treaty clauses, country policies, statistics, or URLs. Mark claims requiring verification as [VERIFY]. Separate verified general knowledge from suggestions. Be balanced, age-appropriate, practical, and concise. Use Markdown headings and lists. Return a JSON object with keys title and content; content is Markdown.`;
      prompt = `Prepare a useful Model UN strategy draft. Country: ${country}. Committee: ${committee}. Agenda: ${agenda}. Other delegations: ${delegations || 'not specified'}. Include: 1) agenda in plain language, 2) country interests and likely policy direction with anything uncertain clearly marked [VERIFY], 3) key issues and stakeholders, 4) three policy arguments in claim-reasoning-impact form, 5) practical solutions and a draft resolution framework, 6) 5 respectful points/questions to raise, 7) likely challenges and response strategies, 8) a short opening speech outline (not a fabricated quote), 9) official sources to look up by organization/name (do not invent URLs), 10) a checklist of claims to verify. Help the student make choices and understand trade-offs. Avoid claiming to have checked live sources.`;
    } else {
      if (!motion) return res.status(400).json({ error: 'Enter a debate motion first.' });
      system = `You are DEBATRIX, a debate preparation coach. Help students build understanding and independent reasoning. Do not claim unsupported facts or invent statistics, studies, quotes, citations, or URLs. Flag factual claims needing checking as [VERIFY]. Use accessible language, respectful framing, and Markdown headings/lists. Return a JSON object with keys title and content; content is Markdown.`;
      prompt = `Create a structured debate preparation draft. Motion: ${motion}. Assigned side: ${side}. Format: ${format}. Detail: ${level}. Include: 1) motion unpacked and important definitions, 2) burden of proof and judging lens, 3) strongest arguments for the assigned side (or both sides if Neutral) with claim, reasoning, impact, and evidence needed, 4) strongest opposing arguments, 5) rebuttal pathways and likely counter-rebuttals, 6) questions to test the case, 7) a clear speech outline, 8) what evidence to find and verify, 9) common weak reasoning to avoid, 10) a short practice checklist. Do not present fabricated evidence as fact. Keep it actionable rather than writing an entire speech for rote memorization.`;
    }
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile', temperature: 0.55, max_tokens: 5000, response_format: { type: 'json_object' }, messages: [{ role: 'system', content: system }, { role: 'user', content: prompt }] })
    });
    const raw = await response.json();
    if (!response.ok) return res.status(response.status).json({ error: raw?.error?.message || 'The AI provider returned an error. Check your Groq key and model setting.' });
    let parsed;
    try { parsed = JSON.parse(raw.choices?.[0]?.message?.content || '{}'); }
    catch { return res.status(502).json({ error: 'The AI response could not be read. Please try again.' }); }
    if (!parsed.content) return res.status(502).json({ error: 'The AI returned an empty preparation. Please try again.' });
    return res.status(200).json({ title: parsed.title || title || (kind === 'mun' ? `${country} · ${agenda}` : motion), content: parsed.content });
  } catch (error) {
    console.error('DEBATRIX API error:', error);
    return res.status(500).json({ error: 'Unexpected server error while generating your preparation.' });
  }
}
