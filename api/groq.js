
export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  if (req.method !== 'POST') {
    return res.status(405).json({
      error: 'Use POST for preparation requests.'
    });
  }

  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) {
    return res.status(503).json({
      error:
        'AI is not configured. Add GROQ_API_KEY in Vercel → Settings → Environment Variables, then redeploy.'
    });
  }

  try {
    const {
      kind,
      motion,
      side = 'Neutral',
      format = 'General school debate',
      level = 'balanced',
      country,
      committee,
      agenda,
      delegations,
      title
    } = req.body || {};

    let system;
    let prompt;

    // MODEL UN PREPARATION
    if (kind === 'mun') {
      if (!country || !committee || !agenda) {
        return res.status(400).json({
          error: 'Add your country, committee, and agenda first.'
        });
      }

      system = `
You are DEBATRIX, a careful Model UN preparation coach.

Help students understand issues and develop their own diplomacy
strategy rather than blindly copying a speech.

Never invent facts, quotes, treaty clauses, country policies,
statistics, citations, or URLs.

Mark claims requiring verification as [VERIFY].
Separate general knowledge from suggestions.
Be balanced, age-appropriate, practical, and concise.

Use Markdown headings and lists.

Return a valid JSON object with exactly these keys:
- title
- content

The content field must contain Markdown.
`;

      prompt = `
Prepare a useful Model UN strategy draft.

Country: ${country}
Committee: ${committee}
Agenda: ${agenda}
Other delegations: ${delegations || 'Not specified'}

Include:

1. Explain the agenda in plain language.
2. Explain the country's interests and likely policy direction.
   Mark uncertain claims [VERIFY].
3. Identify key issues and stakeholders.
4. Give three policy arguments using claim, reasoning, and impact.
5. Suggest practical solutions and a draft resolution framework.
6. Provide five respectful points or questions to raise.
7. Identify likely challenges and possible responses.
8. Provide a short opening speech outline, not a fabricated quote.
9. Name official sources to research without inventing URLs.
10. Include a checklist of claims that must be verified.

Help the student make their own decisions and understand trade-offs.
Do not claim to have checked live sources.
`;

    // DEBATE PREPARATION
    } else {
      if (!motion) {
        return res.status(400).json({
          error: 'Enter a debate motion first.'
        });
      }

      system = `
You are DEBATRIX, a debate preparation coach.

Help students develop understanding, independent reasoning,
and stronger arguments.

Never invent facts, statistics, studies, quotations, citations,
or URLs.

Mark factual claims needing verification as [VERIFY].

Use accessible language, respectful framing, and Markdown
headings and lists.

Return a valid JSON object with exactly these keys:
- title
- content

The content field must contain Markdown.
`;

      prompt = `
Create a structured debate preparation draft.

Motion: ${motion}
Assigned side: ${side}
Format: ${format}
Detail level: ${level}

Include:

1. Explain the motion and define important terms.
2. Explain the burden of proof and judging criteria.
3. Give the strongest arguments for the assigned side.
   If the side is Neutral, explain both sides fairly.
   For each argument, include claim, reasoning, impact,
   and evidence that should be researched.
4. Present the strongest opposing arguments.
5. Suggest rebuttal approaches and likely counter-rebuttals.
6. Provide questions that test the strength of the case.
7. Give a clear speech outline.
8. Explain what evidence to find and verify.
9. Identify common weak reasoning to avoid.
10. End with a practical practice checklist.

Do not present fabricated evidence as fact.
Help the student learn and reason independently rather than
memorising an entire speech.
`;
    }

    // GROQ AI REQUEST
    const model = process.env.GROQ_MODEL || 'openai/gpt-oss-20b';

    const response = await fetch(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model,
          temperature: 0.55,
          max_tokens: 5000,
          response_format: {
            type: 'json_object'
          },
          messages: [
            {
              role: 'system',
              content: system
            },
            {
              role: 'user',
              content: prompt
            }
          ]
        })
      }
    );

    // READ THE PROVIDER RESPONSE SAFELY
    const rawText = await response.text();
    let raw;

    try {
      raw = JSON.parse(rawText);
    } catch {
      console.error('Groq returned a non-JSON response:', response.status);

      return res.status(502).json({
        error: 'The AI provider returned an unreadable response. Please try again.'
      });
    }

    // PROVIDE THE ACTUAL GROQ ERROR
    if (!response.ok) {
      const providerMessage =
        raw?.error?.message ||
        'The AI provider returned an unknown error.';

      console.error('Groq API error:', {
        status: response.status,
        model,
        message: providerMessage
      });

      return res.status(response.status).json({
        error: `Groq API error (${response.status}): ${providerMessage}`,
        model
      });
    }

    // EXTRACT THE GENERATED PREPARATION
    const generatedText = raw?.choices?.[0]?.message?.content;

    if (!generatedText) {
      return res.status(502).json({
        error: 'The AI returned an empty response. Please try again.'
      });
    }

    let parsed;

    try {
      parsed = JSON.parse(generatedText);
    } catch {
      return res.status(502).json({
        error: 'The AI response could not be read. Please try again.'
      });
    }

    if (!parsed.content) {
      return res.status(502).json({
        error: 'The AI returned an empty preparation. Please try again.'
      });
    }

    // SUCCESS
    return res.status(200).json({
      title:
        parsed.title ||
        title ||
        (kind === 'mun'
          ? `${country} · ${agenda}`
          : motion),
      content: parsed.content
    });

  } catch (error) {
    console.error('DEBATRIX API error:', error);

    return res.status(500).json({
      error: 'Unexpected server error while generating your preparation.'
    });
  }
}
