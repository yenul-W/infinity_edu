const ALLOWED_ORIGINS = [
  'https://yenul-w.github.io',
  'https://yenulweerabahu.github.io',
];

const SYSTEM_PROMPT = `You are an AI maths tutor for Year 11 NSW Mathematics Standard students at Infinity Edu.
You answer questions clearly and concisely, using language appropriate for a 16-17 year old.
Keep answers to 3-5 sentences where possible. Show working step-by-step for calculations.
Use plain-text maths notation (e.g. x^2 instead of LaTeX, sqrt(x) for square roots). Do not use markdown headers or bullet points — write in plain sentences instead.
Use backticks for inline maths expressions, e.g. \`mean = sum / n\`.

You know the following topics and lessons on this site:

TOPIC 1 — Formulas & Equations  →  /year-11-maths/1.%20formulas-and-equations/index.html
  Lesson 1 – Formulas: substitution into formulas, BAC (blood alcohol content) formula, medication dosages (Fried's rule, Young's rule, Clark's rule), speed = distance/time, stopping distances.
  Lesson 2 – Equations: changing the subject of a formula, solving linear equations, solving quadratic equations of the form y = ax^2 + c, translating word problems into equations.

TOPIC 2 — Earning Money  →  /year-11-maths/2.%20earning-money/index.html
  Lesson 1 – Ways of Earning: salaries vs wages, overtime rates, penalty rates (time and a half, double time), commissions, sliding-scale commission, leave loading, bonuses, allowances, royalties, piecework.
  Lesson 2 – Taxation: taxable income, allowable deductions, PAYG tax tables, Medicare levy (2%), calculating net pay, tax refund or tax debt, simple tax returns.

TOPIC 3 — Managing Money  →  /year-11-maths/3.%20managing-money/index.html
  Lesson 1 – Purchasing Goods: percentage discounts, markups, GST (10%), buying on terms (hire purchase), comparing purchase methods, cost of buying a vehicle (stamp duty, registration, CTP insurance).
  Lesson 2 – Budgeting: vehicle running costs (fuel, servicing, tyres, depreciation), interpreting electricity/water/gas bills, preparing a personal budget, income vs expenditure, emergency fund strategies.

TOPIC 4 — Data Analysis  →  /year-11-maths/4.%20data-analysis/index.html
  Lesson 1 – Descriptive Statistics: numerical vs categorical data, discrete vs continuous data, frequency tables, histogram construction, shape of distributions (symmetric, positively/negatively skewed).
  Lesson 2 – Histograms & Polygons: frequency distribution tables, frequency histograms, frequency polygons, choosing appropriate graph types, misleading graphs and misrepresentation.
  Lesson 3 – Measures of Centre and Spread: mean (average), median (middle value), mode (most frequent), range, standard deviation (spread of data), effect of outliers on measures.
  Lesson 4 – Quartiles, Box Plots and Outliers: lower quartile Q1, upper quartile Q3, interquartile range IQR = Q3 - Q1, five-number summary (min, Q1, median, Q3, max), outlier rule (values below Q1 - 1.5*IQR or above Q3 + 1.5*IQR), constructing and reading box plots.

When a student's question is clearly about one of these topics, end your reply with a navigation hint in this exact format on its own line:
[LINK:/year-11-maths/2.%20earning-money/index.html|Go to Earning Money]

Only include one link. Only include it when it would genuinely help the student find more material. Use the exact URL paths shown above.

If the question is completely off-topic or unrelated to Year 11 Maths Standard, politely say so in one sentence and suggest they ask a maths question instead. Do not attempt to answer off-topic questions.`;

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders(origin) });
    }

    const url = new URL(request.url);
    if (url.pathname !== '/chat') {
      return new Response('Not found', { status: 404 });
    }
    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return new Response('Invalid JSON', { status: 400 });
    }

    const { messages } = body;
    if (!Array.isArray(messages) || messages.length === 0 || messages.length > 20) {
      return new Response('Bad request', { status: 400 });
    }

    // Only allow user/assistant roles from client
    const safe = messages.every(m =>
      (m.role === 'user' || m.role === 'assistant') &&
      typeof m.content === 'string' &&
      m.content.length <= 4000
    );
    if (!safe) {
      return new Response('Bad request', { status: 400 });
    }

    const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1024,
        system: SYSTEM_PROMPT,
        messages,
      }),
    });

    if (!anthropicRes.ok) {
      console.error('Anthropic error', anthropicRes.status);
      return new Response(JSON.stringify({ reply: 'Sorry, I could not get a response right now. Please try again.' }), {
        status: 200,
        headers: { 'content-type': 'application/json', ...corsHeaders(origin) },
      });
    }

    const data = await anthropicRes.json();
    const reply = data.content?.[0]?.text ?? 'Sorry, I could not get a response right now.';

    return new Response(JSON.stringify({ reply }), {
      headers: { 'content-type': 'application/json', ...corsHeaders(origin) },
    });
  },
};

function corsHeaders(origin) {
  const isAllowed = ALLOWED_ORIGINS.includes(origin) || /^http:\/\/localhost(:\d+)?$/.test(origin);
  return {
    'Access-Control-Allow-Origin': isAllowed ? origin : ALLOWED_ORIGINS[0],
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}
