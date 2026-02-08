const FEATHERLESS_API_KEY = import.meta.env.VITE_FEATHERLESS_API_KEY

// Ensemble of judges with different models and personalities
const JUDGES = [
  {
    id: 'og',
    name: 'OG Mike',
    emoji: '🎤',
    model: 'deepseek-ai/DeepSeek-V3-0324',
    personality: `You are OG Mike, a veteran battle rap judge from the 90s hip-hop scene. 
You value old-school lyricism, complex rhyme schemes, and raw authenticity. 
You're tough but fair, and you appreciate bars that would make Rakim proud.`,
  },
  {
    id: 'tech',
    name: 'DJ Neural',
    emoji: '🤖',
    model: 'meta-llama/Llama-3.3-70B-Instruct',
    personality: `You are DJ Neural, a modern hip-hop analyst who breaks down rap technically.
You focus on syllable patterns, internal rhymes, flow switches, and delivery precision.
You appreciate innovative wordplay and technical mastery.`,
  },
  {
    id: 'street',
    name: 'Queen Bars',
    emoji: '👑',
    model: 'Qwen/Qwen2.5-72B-Instruct',
    personality: `You are Queen Bars, a fierce battle rap queen who's seen thousands of battles.
You value confidence, stage presence, crowd engagement, and memorable punchlines.
You know what makes the crowd go "OHHH!" and judge accordingly.`,
  },
]

const GRADE_PROMPT = `Grade this rap battle performance on a scale of 1-10.

Evaluate:
- Flow & Rhythm (smoothness, timing)
- Wordplay & Punchlines (cleverness, impact)
- Delivery & Confidence
- Creativity & Originality

Respond in this EXACT JSON format only, no other text:
{"score": <number 1-10>, "comment": "<one punchy sentence in your character's voice>"}`

async function callFeatherless(model, messages) {
  const response = await fetch('https://api.featherless.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${FEATHERLESS_API_KEY}`,
    },
    body: JSON.stringify({
      model,
      messages,
      max_tokens: 150,
      temperature: 0.7,
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    console.error(`Featherless API error (${model}):`, error)
    throw new Error(`Judge unavailable`)
  }

  const data = await response.json()
  return data.choices?.[0]?.message?.content || ''
}

function parseJudgeResponse(content) {
  try {
    const jsonMatch = content.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0])
      return {
        score: Math.min(10, Math.max(1, Number(parsed.score) || 5)),
        comment: parsed.comment || 'No comment.',
      }
    }
  } catch (e) {
    console.error('Parse error:', e)
  }
  return { score: 5, comment: content.slice(0, 100) }
}

export async function getJudgePanel(transcript) {
  console.log('🎤 Assembling judge panel...')
  
  const judgePromises = JUDGES.map(async (judge) => {
    try {
      console.log(`${judge.emoji} ${judge.name} is judging...`)
      
      const content = await callFeatherless(judge.model, [
        { role: 'system', content: judge.personality + '\n\n' + GRADE_PROMPT },
        { role: 'user', content: `Grade this performance:\n\n"${transcript}"` },
      ])
      
      const result = parseJudgeResponse(content)
      console.log(`${judge.emoji} ${judge.name}: ${result.score}/10`)
      
      return {
        ...judge,
        score: result.score,
        comment: result.comment,
        success: true,
      }
    } catch (error) {
      console.error(`${judge.name} failed:`, error)
      return {
        ...judge,
        score: null,
        comment: 'Judge unavailable',
        success: false,
      }
    }
  })

  const results = await Promise.allSettled(judgePromises)
  const judges = results.map(r => r.status === 'fulfilled' ? r.value : { ...JUDGES[0], success: false })
  
  // Calculate average from successful judges
  const successfulJudges = judges.filter(j => j.success && j.score !== null)
  const avgScore = successfulJudges.length > 0
    ? successfulJudges.reduce((sum, j) => sum + j.score, 0) / successfulJudges.length
    : 5

  // Determine grade letter
  const gradeLetter = 
    avgScore >= 9.5 ? 'A+' :
    avgScore >= 9 ? 'A' :
    avgScore >= 8.5 ? 'A-' :
    avgScore >= 8 ? 'B+' :
    avgScore >= 7.5 ? 'B' :
    avgScore >= 7 ? 'B-' :
    avgScore >= 6.5 ? 'C+' :
    avgScore >= 6 ? 'C' :
    avgScore >= 5.5 ? 'C-' :
    avgScore >= 5 ? 'D+' :
    avgScore >= 4 ? 'D' : 'F'

  return {
    judges,
    avgScore: Math.round(avgScore * 10) / 10,
    gradeLetter,
  }
}

export { JUDGES }

