
export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Use POST for preparation requests."
    });
  }

  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) {
    return res.status(503).json({
      error: "AI is not configured. Add GROQ_API_KEY in Vercel Environment Variables and redeploy."
    });
  }

  const body = req.body || {};
  const kind = body.kind === "mun" ? "mun" : "debate";

  const clean = (value, max = 3000) =>
    typeof value === "string"
      ? value.trim().slice(0, max)
      : "";

  const motion = clean(body.motion, 1000);
  const side = clean(body.side || "Neutral", 100);
  const format = clean(body.format || "General school debate", 150);
  const level = clean(body.level || "balanced", 50);

  const country = clean(body.country, 150);
  const committee = clean(body.committee, 200);
  const agenda = clean(body.agenda, 1500);
  const delegations = clean(body.delegations, 1500);

  if (kind === "debate" && !motion) {
    return res.status(400).json({
      error: "Enter a debate motion first."
    });
  }

  if (kind === "mun" && (!country || !committee || !agenda)) {
    return res.status(400).json({
      error: "Enter your country, committee and agenda."
    });
  }

  let system;
  let prompt;

  if (kind === "mun") {
    system = `
You are DEBATRIX, a serious Model United Nations strategy coach.

Your job is to help a delegate understand the issue, develop a defensible
national position, negotiate effectively and think independently.

QUALITY RULES:
- Every recommendation must connect to the exact agenda and assigned country.
- Distinguish established facts, analysis and proposed strategy.
- Never invent a country's policy, treaty provision, quotation, statistic,
  UN resolution, alliance or historical event.
- Never invent citations, URLs or claim you checked sources you did not check.
- Mark time-sensitive or uncertain country-specific claims [VERIFY].
- Where knowledge of a country's position is uncertain, explain what the
  delegate must establish through research instead of guessing.
- Explain causal reasoning, trade-offs, feasibility and implementation.
- Avoid generic diplomatic language, repetitive paragraphs and empty slogans.
- Do not write an entire speech for the student to memorise.
  Give a strong outline and a short example of how to express an argument.
- Recommendations must be practical enough to negotiate and draft into clauses.
- Do not force a predetermined number of arguments if fewer are genuinely strong.
- Write in precise, professional, accessible English.

Return valid JSON only, with exactly these keys:
"title" (string), "content" (Markdown string).
`;

    prompt = `
Build a competition-ready MUN strategy briefing.

COUNTRY: ${country}
COMMITTEE: ${committee}
AGENDA: ${agenda}
OTHER DELEGATIONS: ${delegations || "Not specified"}

First, reason carefully about the exact problem, the committee's authority,
the country's interests and the likely disagreements. Do not expose private
chain-of-thought. Present conclusions, concise reasoning and useful analysis.

Use these sections:

## 1. The actual problem
Explain the problem in plain English. Identify its causes, affected groups,
why previous approaches may fail and the central policy conflict.

## 2. The country's position
Separate reasonably established policy from points requiring verification.
Explain the country's interests, responsibilities, constraints and likely
concerns. Do not assume the country supports a proposal without justification.

## 3. The central strategic argument
State the most defensible position this delegation can take.
Explain what it should prioritise, what it can concede and what it should resist.

## 4. Strong policy arguments
Develop up to three arguments specific to this agenda.
For each provide:
- Claim
- Reasoning: how the proposal produces the intended result
- Practical impact
- Evidence needed and credible places to find it
- Strongest counterargument
- A response that addresses that counterargument honestly

## 5. Proposals that could work
Give three concrete, distinct policy proposals where appropriate.
For each explain who implements it, how it is funded, how compliance or
progress is assessed, and one limitation. Do not propose unrealistic solutions.

## 6. Negotiation strategy
Identify potential areas of shared interest without inventing confirmed allies.
Explain useful compromises, red lines and a realistic path to agreement.
Label uncertain assumptions [VERIFY].

## 7. Pressure-testing questions
Give five sharp, diplomatic POIs. For each explain what weakness or trade-off
the question tests. Avoid questions that can be answered with a simple yes/no
unless that answer exposes a useful contradiction.

## 8. Opening speech plan
Give a compelling opening idea, the delegation's position, two policy priorities
and a clear call for cooperation. Explain what each part must accomplish.
Provide a short sample passage, not a complete memorisation script.

## 9. Likely challenges
Give three serious challenges other delegates could raise and defensible,
specific responses. Do not invent evidence to win an argument.

## 10. Research priorities
List the five most useful facts to verify before the conference.
Name appropriate official sources, such as relevant UN agencies, UN documents,
national government statements, treaties or official statistical agencies.
Explain what to search for. Do not fabricate links or document titles.

Finish with:
### Your next 20 minutes
Give a realistic, timed plan for turning this briefing into the delegate's
own arguments and checking its weakest factual claims.

Avoid repeating the same idea in multiple sections. Make every section useful.
`;

  } else {
    system = `
You are DEBATRIX, a rigorous competitive debate coach.

You help students construct arguments, understand mechanisms, anticipate
opposition and improve their independent reasoning. You are not an essay
generator and must not fill space to appear comprehensive.

QUALITY RULES:
- Analyse the exact motion before developing arguments.
- Respect the assigned side and debate format.
- Identify the real point of disagreement, burdens of proof and what decides
  the debate. Do not just list generic pros and cons.
- Build arguments as logical chains: claim, mechanism, impact and comparison.
- Explain WHY each link follows. Identify assumptions and possible failure points.
- Steelman the strongest opposition instead of presenting a weak opponent.
- A rebuttal must engage with the opponent's actual reasoning, not just disagree.
- Compare impacts using probability, scale, timeframe, reversibility and who
  is affected where those comparisons are relevant.
- Never invent statistics, research, quotations, cases or URLs.
- Label illustrative hypotheticals as examples, not real-world evidence.
- Mark claims needing verification [VERIFY] and identify credible evidence sources.
- Do not force an argument to fit the motion if it does not logically support it.
- If the assigned side is Neutral, compare both sides fairly and identify
  the conditions under which each is stronger.
- Avoid repetitive points, vague advice, fake certainty and filler.
- Teach the student how to think and adapt the case in their own words.
- Use the selected debate format when its rules are known. If format details
  are unclear, state the assumption rather than inventing rules.

Return valid JSON only, with exactly these keys:
"title" (string), "content" (Markdown string).
`;

    prompt = `
Create a high-quality, motion-specific debate coaching brief.

MOTION: ${motion}
ASSIGNED SIDE: ${side}
FORMAT: ${format}
DETAIL LEVEL: ${level}

Do not begin with a long generic introduction. Identify the central clash:
what the two sides fundamentally disagree about, what each side must prove,
and which questions are most likely to decide the debate.

Use these sections:

## 1. What this motion really means
Explain it in plain English. Clarify ambiguous terms and reasonable definitions.
Identify the key stakeholders, the proposed change or principle, and the
most important question the judge must resolve.

## 2. The strategic burden
Explain what our side must prove, what it does not need to prove, the
opposition's strongest burden and the most important weighing mechanism.
Tailor this to the actual motion.

## 3. The strongest case for our side
Develop up to three genuinely distinct arguments. Do not repeat the same
benefit using different wording.

For each argument include:
**Claim:** One precise sentence.
**Mechanism:** The step-by-step causal logic explaining why the claim holds.
**Impact:** Who is affected, how and why it matters.
**Illustration:** A clearly labelled hypothetical or a real example only when
you are confident it is genuine.
**Evidence to verify:** The particular claim that needs evidence and the
most relevant credible source type.
**Weak link:** The assumption the opponent should attack.
**Defence:** The best honest response to that weakness.

## 4. The strongest opposing case
Present the opposition's best two arguments fairly.
Explain the reasoning that makes each persuasive and identify the assumption
or trade-off on which it depends. Do not make the opposing side look foolish.

## 5. Rebuttal workshop
For each major opposing argument, provide:
- The exact claim being challenged
- The best response
- Why that response works logically
- The opponent's likely reply
- How our side should adapt if that reply succeeds

Distinguish between disproving an argument, reducing its importance and
showing that our side performs better comparatively.

## 6. The decisive comparisons
Identify the two or three comparisons most likely to determine the debate.
Compare probability, scale, timeframe, distribution of benefits and harms,
and reversibility where relevant. Explain which side has the advantage and why.
Do not pretend uncertain outcomes are guaranteed.

## 7. Questions that expose weaknesses
Give five pointed cross-examination questions tailored to the motion.
For each, explain the assumption it tests and what a useful answer would reveal.
Avoid generic questions that could be used in any debate.

## 8. Speech architecture
Give a format-aware structure for the speaker's role, with the purpose of
each section and the reasoning that must be established. Do not invent
format rules if they are unknown. Do not provide a full speech to memorise.

## 9. Evidence plan
List five specific factual questions worth researching.
For each, identify an appropriate source type, what finding would support
our case, and what finding might weaken it. Never invent numbers or citations.
Mark claims that require checking [VERIFY].

## 10. Practice that improves the case
Give one short drill in which the student must defend the weakest assumption,
one drill for responding to an unexpected argument, and a 10-minute practice
plan. Include a simple self-assessment checklist.

Be selective. If a section does not add a useful new insight, keep it brief.
The result must sound like a skilled coach analysed THIS motion, not a template
filled with generic paragraphs.
`;
  }

  try {
    const response = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: process.env.GROQ_MODEL || "openai/gpt-oss-20b",
          temperature: 0.45,
          max_tokens: 5000,
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: system },
            { role: "user", content: prompt }
          ]
        })
      }
    );

    const raw = await response.json();

    if (!response.ok) {
      console.error("Groq API error:", raw?.error?.message || response.status);

      return res.status(502).json({
        error:
          raw?.error?.message ||
          "The AI provider returned an error. Check your Groq key, model setting and usage limits."
      });
    }

    const output = raw?.choices?.[0]?.message?.content;

    if (!output) {
      return res.status(502).json({
        error: "The AI returned an empty response. Please try again."
      });
    }

    let parsed;

    try {
      parsed = JSON.parse(output);
    } catch {
      console.error("Groq returned invalid JSON.");

      return res.status(502).json({
        error: "The AI response could not be processed. Please try again."
      });
    }

    if (typeof parsed.content !== "string" || !parsed.content.trim()) {
      return res.status(502).json({
        error: "The AI returned incomplete preparation. Please try again."
      });
    }

    const title =
      typeof parsed.title === "string" && parsed.title.trim()
        ? parsed.title.trim().slice(0, 200)
        : kind === "mun"
          ? `${country} — ${agenda}`
          : motion;

    return res.status(200).json({
      title,
      content: parsed.content.trim()
    });
  } catch (error) {
    console.error("DEBATRIX generation error:", error);

    return res.status(500).json({
      error: "Could not connect to the AI service. Please try again."
    });
  }
}
