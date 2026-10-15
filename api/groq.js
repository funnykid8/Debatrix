
export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Use POST for preparation requests." });
  }

  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) {
    return res.status(503).json({
      error: "AI is not configured. Add GROQ_API_KEY in Vercel and redeploy."
    });
  }

  const clean = (value, max = 4000) =>
    typeof value === "string" ? value.trim().slice(0, max) : "";

  try {
    const body = req.body || {};
    const kind = clean(body.kind, 20);
    const title = clean(body.title, 300);
    const motion = clean(body.motion, 1500);
    const side = clean(body.side, 30) || "Neutral";
    const format = clean(body.format, 100) || "General school debate";
    const level = clean(body.level, 30) || "balanced";
    const country = clean(body.country, 100);
    const committee = clean(body.committee, 150);
    const agenda = clean(body.agenda, 1500);
    const delegations = clean(body.delegations, 1000);

    let system;
    let prompt;

    if (kind === "mun") {
      if (!country || !committee || !agenda) {
        return res.status(400).json({
          error: "Enter your country, committee, and agenda."
        });
      }

      system = `
You are DEBATRIX, a rigorous Model UN strategy coach.

Your job is to help a student understand the issue, represent their
assigned country responsibly, negotiate effectively, and develop
their own arguments.

QUALITY RULES:
- Be specific to the exact agenda, committee and country.
- Never invent statistics, quotations, treaties, resolutions,
  voting records, national policies, or sources.
- Do not pretend you searched the internet or checked live documents.
- Separate established general knowledge from analysis and proposals.
- Mark uncertain country-policy claims [VERIFY].
- Recommend primary sources by their real institution or document type.
- Make every proposal practical: identify who acts, what they do,
  how it could be implemented, and what obstacles might arise.
- Avoid generic diplomatic filler, repetitive points, and empty slogans.
- Explain why each strategy is useful and what its trade-offs are.
- Use clear Markdown, informative headings and concise language.
- Do not write an entire speech for the student to memorise.
- Return valid JSON only, with exactly these keys:
  {"title":"...","content":"Markdown text"}
`;

      prompt = `
Prepare a strategic briefing using these details:

COUNTRY: ${country}
COMMITTEE: ${committee}
AGENDA: ${agenda}
OTHER DELEGATIONS: ${delegations || "Not specified"}

Use this structure:

## 1. The issue
Explain the problem in plain English, its causes, who is affected,
and what this committee can realistically address.

## 2. Country strategy
Explain the country's relevant interests and likely priorities.
Clearly mark uncertain or unverified positions [VERIFY].
Identify the main policy objective the delegate should pursue.

## 3. Three policy arguments
For each argument provide:
- Claim: the precise position to defend.
- Reasoning: why the policy makes sense.
- Mechanism: how the proposed approach would work.
- Impact: who benefits and how.
- Vulnerability: the strongest objection or trade-off.
- Response: a credible answer to that objection.
- Evidence needed: the exact fact or document worth researching.

Make these three arguments meaningfully different.

## 4. Draftable solutions
Give three realistic policy proposals that could inform operative
clauses. For each, identify the action, responsible actor, implementation
approach, and likely obstacle. Do not invent legal authority.

## 5. Negotiation plan
Suggest possible negotiating partners based on policy interests,
not stereotypes. Identify a reasonable compromise, a priority to protect,
and a question to ask before committing to an alliance.
Mark assumptions about other countries [VERIFY].

## 6. Questions and responses
Give five purposeful POIs. For each, explain what information or
commitment the question is designed to reveal.
Then give three likely challenges to this country's position and
strong, diplomatic response strategies.

## 7. Opening speech plan
Provide a concise opening structure: hook, diagnosis, national position,
two concrete policy asks, and closing. Use prompts and key points
rather than a memorised speech.

## 8. Research plan
List the most useful official institutions, treaty texts, UN documents,
government publications or datasets to consult for this exact agenda.
Explain what each could verify. Do not invent document titles, URLs,
statistics or citations.

Prioritise strategic depth over length. Avoid repeating the same
argument in several sections. If a country position cannot be
established confidently, say so and show the student how to verify it.
`;

    } else {
      if (!motion) {
        return res.status(400).json({
          error: "Enter a debate motion first."
        });
      }

      system = `
You are DEBATRIX, a high-standard competitive debate coach.

Produce a case that could only have been written for this specific motion.
Teach the student to reason, not merely to memorise polished paragraphs.

QUALITY RULES:
- Analyse the actual wording and implications of the motion.
- Respect the selected side and debate format.
- Do not invent research, statistics, quotations, studies or citations.
- Label claims requiring verification [VERIFY].
- If evidence is unavailable, explain what evidence would test the claim.
- Distinguish a logical argument from an empirical claim.
- Consider implementation, incentives, affected groups and trade-offs.
- Give the opposition its strongest plausible case, not a weak straw man.
- Explain why arguments succeed or fail.
- Avoid generic introductions, repeated claims and empty rhetoric.
- Use specific examples only when you can explain the mechanism.
- Adapt language and depth to the requested level.
- Return valid JSON only, with exactly these keys:
  {"title":"...","content":"Markdown text"}
`;

      const levelInstructions = {
        beginner: `
Use accessible language. Explain unfamiliar terms.
Make the causal reasoning especially clear.
Keep the case manageable for someone learning debate.`,
        balanced: `
Be clear, strategic and competition-ready.
Explain the most important reasoning without unnecessary jargon.`,
        advanced: `
Use deeper comparative analysis, burdens of proof, incentives,
second-order effects, stakeholder trade-offs and strategic weighing.
Identify sophisticated vulnerabilities in the case.`
      };

      prompt = `
Build a motion-specific debate coaching brief.

MOTION: ${motion}
SIDE: ${side}
FORMAT: ${format}
LEVEL: ${levelInstructions[level] || levelInstructions.balanced}

Use this structure:

## 1. What the motion really means
Explain the wording, reasonable definitions, the central disagreement,
and any assumptions that need to be made explicit.
Do not redefine the motion merely to make the chosen side easier to win.

## 2. What wins the debate
Explain what this side must prove, the most important questions for the
judge, and which impacts should be compared first.
Adapt the advice to the selected debate format.

## 3. The strongest arguments
Develop three distinct arguments tailored to this motion.

For each, include:
- Claim: one precise, contestable point.
- Mechanism: step by step, how the claimed effect occurs.
- Stakeholders: who is affected and why.
- Impact: why the outcome matters compared with the alternative.
- Example: a relevant illustration or clearly labelled hypothetical.
- Evidence needed: what fact would support or weaken the claim.
- Weakness: the strongest reasonable objection.
- Defence: how to answer without ignoring the weakness.

Do not create fake statistics or treat plausible assumptions as facts.

## 4. The strongest opposing case
Present three credible arguments for the other side.
Explain the underlying logic and identify which challenge is hardest
for the chosen side to answer.

If the selected side is Neutral, compare both sides fairly and explain
what additional information would help decide between them.

## 5. Rebuttal workshop
Choose the two most important clashes in this debate.
For each, show:
- The opposing claim.
- The underlying assumption.
- A direct response.
- The likely counter-response.
- How to defend the response or concede a genuine weakness.

Avoid rebuttals that simply repeat the original argument.

## 6. Cross-examination
Give five short questions that expose assumptions, test feasibility,
or clarify the opposition's priorities. Explain what each question tests.

## 7. Speech plan
Give a clear opening, argument order, transitions, weighing and conclusion.
Explain the purpose of each part rather than writing a speech to memorise.

## 8. Evidence and verification
List the precise claims that need evidence and suggest credible sources
or research methods appropriate to this motion.
Do not invent sources or pretend evidence has already been checked.

## 9. Personal practice
Give one difficult challenge question, a short exercise for improving
the weakest argument, and a checklist for evaluating the case.

Keep the output useful rather than exhaustive. Every section must add
new value. Prioritise the strongest reasoning over the number of words.
`;

    }

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
          temperature: 0.35,
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
        error: "The AI provider could not complete this preparation. Check your model and API settings, then try again."
      });
    }

    const output = raw.choices?.[0]?.message?.content || "";
    let parsed;

    try {
      parsed = JSON.parse(output);
    } catch {
      return res.status(502).json({
        error: "The AI returned an unreadable response. Please try again."
      });
    }

    if (typeof parsed.content !== "string" || !parsed.content.trim()) {
      return res.status(502).json({
        error: "The AI returned an empty preparation. Please try again."
      });
    }

    const resultTitle =
      clean(parsed.title, 300) ||
      title ||
      (kind === "mun" ? `${country} · ${agenda}` : motion);

    return res.status(200).json({
      title: resultTitle,
      content: parsed.content.trim()
    });

  } catch (error) {
    console.error("DEBATRIX preparation error:", error);

    return res.status(500).json({
      error: "Something went wrong while generating your preparation. Please try again."
    });
  }
}
