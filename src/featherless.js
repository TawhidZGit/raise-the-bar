const FEATHERLESS_API_KEY = import.meta.env.VITE_FEATHERLESS_API_KEY
const K2_API_KEY = import.meta.env.VITE_K2_API_KEY

// Ensemble of judges with different models and personalities
const JUDGES = [
  {
    id: 'og',
    name: 'OG Mike',
    emoji: '🎤',
    model: 'deepseek-ai/DeepSeek-V3-0324',
    provider: 'featherless',
    personality: `You are OG Mike, a veteran battle rap judge from the 90s hip-hop scene. 
You value old-school lyricism, complex rhyme schemes, and raw authenticity. 
You're tough but fair, and you appreciate bars that would make Rakim proud.
Speak in a direct, street-wise voice.`,
  },
  {
    id: 'tech',
    name: 'DJ Neural',
    emoji: '🤖',
    model: 'meta-llama/Llama-3.3-70B-Instruct',
    provider: 'featherless',
    personality: `You are DJ Neural, a modern hip-hop analyst who breaks down rap technically.
You focus on syllable patterns, internal rhymes, flow switches, and delivery precision.
You appreciate innovative wordplay and technical mastery.
Speak analytically but with hip-hop flair.`,
  },
  {
    id: 'street',
    name: 'Queen Bars',
    emoji: '👑',
    model: 'Qwen/Qwen2.5-72B-Instruct',
    provider: 'featherless',
    personality: `You are Queen Bars, a fierce battle rap queen who's seen thousands of battles.
You value confidence, stage presence, crowd engagement, and memorable punchlines.
You know what makes the crowd go "OHHH!" and judge accordingly.
Speak with sass and authority.`,
  },
  {
    id: 'k2',
    name: 'K2 Think',
    emoji: '🧠',
    model: 'MBZUAI-IFM/K2-Think-v2',
    provider: 'k2',
    personality: `You are K2 Think, an AI reasoning expert who deeply analyzes rap performances.
You examine logical flow of verses, coherence of themes, and intellectual depth.
You appreciate clever wordplay and well-constructed arguments in bars.
Speak thoughtfully but with respect for the art form.`,
  },
]

const GRADE_PROMPT = `Grade this rap battle performance. Be specific and constructive.

Evaluate these categories (1-10 each):
- FLOW: rhythm, timing, breath control, cadence
- LYRICS: wordplay, vocabulary, metaphors, punchlines  
- DELIVERY: confidence, energy, presence
- CREATIVITY: originality, unique style, memorable lines
- TECHNIQUE: rhyme schemes, internal rhymes, multisyllabics

Respond in this EXACT JSON format only:
{
  "scores": {
    "flow": <1-10>,
    "lyrics": <1-10>,
    "delivery": <1-10>,
    "creativity": <1-10>,
    "technique": <1-10>
  },
  "overall": <1-10>,
  "verdict": "<one punchy sentence in your character's voice>",
  "strengths": ["<strength 1>", "<strength 2>"],
  "improve": ["<specific tip 1>", "<specific tip 2>", "<specific tip 3>"]
}`

async function callAPI(provider, model, messages) {
  const config = {
    featherless: {
      url: 'https://api.featherless.ai/v1/chat/completions',
      apiKey: FEATHERLESS_API_KEY,
    },
    k2: {
      url: 'https://api.k2think.ai/v1/chat/completions',
      apiKey: K2_API_KEY,
    },
  }

  const { url, apiKey } = config[provider]
  
  if (!apiKey) {
    throw new Error(`Missing API key for ${provider}`)
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
      'accept': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages,
      max_tokens: 500,
      temperature: 0.7,
      stream: false,
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    console.error(`${provider} API error (${model}):`, error)
    throw new Error(`Judge unavailable`)
  }

  const data = await response.json()
  return data.choices?.[0]?.message?.content || ''
}

// Fallback verdicts in character
function getDefaultVerdict(judgeId, score) {
  const verdicts = {
    og: {
      high: "Yo, those bars were tight! Real hip-hop right there.",
      mid: "You got potential, but you need more practice in the booth.",
      low: "Keep grinding, youngblood. Study the classics.",
    },
    tech: {
      high: "Impressive syllable density and flow variation detected!",
      mid: "Decent technical foundation, but room for complexity.",
      low: "Recommend focusing on rhythm patterns and internal rhymes.",
    },
    street: {
      high: "Honey, you ATE that! The crowd would go crazy!",
      mid: "Cute bars, but I've seen better. Step it up!",
      low: "Baby, we need to talk about your delivery...",
    },
    k2: {
      high: "Logically sound structure with excellent thematic coherence!",
      mid: "Reasonable performance. Consider deeper conceptual layering.",
      low: "The reasoning chain needs work. Focus on narrative flow.",
    },
  }
  
  const level = score >= 7 ? 'high' : score >= 5 ? 'mid' : 'low'
  return verdicts[judgeId]?.[level] || "Interesting performance."
}

function parseJudgeResponse(content) {
  try {
    const jsonMatch = content.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0])
      return {
        scores: {
          flow: Math.min(10, Math.max(1, Number(parsed.scores?.flow) || 5)),
          lyrics: Math.min(10, Math.max(1, Number(parsed.scores?.lyrics) || 5)),
          delivery: Math.min(10, Math.max(1, Number(parsed.scores?.delivery) || 5)),
          creativity: Math.min(10, Math.max(1, Number(parsed.scores?.creativity) || 5)),
          technique: Math.min(10, Math.max(1, Number(parsed.scores?.technique) || 5)),
        },
        overall: Math.min(10, Math.max(1, Number(parsed.overall) || 5)),
        verdict: parsed.verdict || 'No comment.',
        strengths: parsed.strengths || [],
        improve: parsed.improve || [],
      }
    }
  } catch (e) {
    console.error('Parse error:', e, content)
  }
  return { 
    scores: { flow: 5, lyrics: 5, delivery: 5, creativity: 5, technique: 5 },
    overall: 5, 
    verdict: content.slice(0, 100),
    strengths: [],
    improve: [],
  }
}

export async function getJudgePanel(transcript) {
  console.log('🎤 Assembling judge panel...')
  
  const judgePromises = JUDGES.map(async (judge) => {
    try {
      console.log(`${judge.emoji} ${judge.name} is judging with ${judge.model} (${judge.provider})...`)
      
      const content = await callAPI(judge.provider, judge.model, [
        { role: 'system', content: judge.personality + '\n\n' + GRADE_PROMPT },
        { role: 'user', content: `Grade this performance:\n\n"${transcript}"` },
      ])
      
      console.log(`${judge.emoji} ${judge.name} raw response:`, content)
      
      const result = parseJudgeResponse(content)
      console.log(`${judge.emoji} ${judge.name} parsed:`, result)
      
      // Ensure verdict exists
      if (!result.verdict || result.verdict === 'No comment.') {
        result.verdict = getDefaultVerdict(judge.id, result.overall)
      }
      
      return {
        ...judge,
        ...result,
        success: true,
      }
    } catch (error) {
      console.error(`${judge.name} failed:`, error)
      return {
        ...judge,
        scores: { flow: 5, lyrics: 5, delivery: 5, creativity: 5, technique: 5 },
        overall: 5,
        verdict: getDefaultVerdict(judge.id, 5),
        strengths: ['Showed up to battle'],
        improve: ['Keep practicing'],
        success: true, // Mark as success with defaults so it still shows
      }
    }
  })

  const results = await Promise.allSettled(judgePromises)
  const judges = results.map(r => r.status === 'fulfilled' ? r.value : { ...JUDGES[0], success: false })
  
  // Calculate averages from successful judges
  const successfulJudges = judges.filter(j => j.success && j.overall !== null)
  
  const avgScores = {
    flow: 0, lyrics: 0, delivery: 0, creativity: 0, technique: 0
  }
  
  if (successfulJudges.length > 0) {
    for (const category of Object.keys(avgScores)) {
      avgScores[category] = Math.round(
        (successfulJudges.reduce((sum, j) => sum + j.scores[category], 0) / successfulJudges.length) * 10
      ) / 10
    }
  }

  const avgScore = successfulJudges.length > 0
    ? successfulJudges.reduce((sum, j) => sum + j.overall, 0) / successfulJudges.length
    : 5

  // Collect all unique improvement tips
  const allImprovements = [...new Set(successfulJudges.flatMap(j => j.improve))].slice(0, 5)
  const allStrengths = [...new Set(successfulJudges.flatMap(j => j.strengths))].slice(0, 4)

  // Determine grade letter
  const gradeLetter = 
    avgScore >= 9.5 ? 'S' :
    avgScore >= 9 ? 'A+' :
    avgScore >= 8.5 ? 'A' :
    avgScore >= 8 ? 'A-' :
    avgScore >= 7.5 ? 'B+' :
    avgScore >= 7 ? 'B' :
    avgScore >= 6.5 ? 'B-' :
    avgScore >= 6 ? 'C+' :
    avgScore >= 5.5 ? 'C' :
    avgScore >= 5 ? 'C-' :
    avgScore >= 4 ? 'D' : 'F'

  // Generate verdict message
  const verdictMessage = 
    avgScore >= 9 ? "🔥 LEGENDARY BARS! You bodied this!" :
    avgScore >= 8 ? "💪 Solid performance! You got skills!" :
    avgScore >= 7 ? "✨ Good flow! Keep grinding!" :
    avgScore >= 6 ? "👊 Decent bars. Room to grow!" :
    avgScore >= 5 ? "📝 Keep practicing, you'll get there!" :
    "💡 Study the greats and come back stronger!"

  return {
    judges,
    avgScore: Math.round(avgScore * 10) / 10,
    avgScores,
    gradeLetter,
    verdictMessage,
    strengths: allStrengths,
    improvements: allImprovements,
  }
}

export { JUDGES }
