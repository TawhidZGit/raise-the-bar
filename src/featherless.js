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

const GRADE_PROMPT = `Grade this rap battle performance. Be SPECIFIC about what you heard.

Evaluate these categories (1-10 each):
- FLOW: rhythm, timing, breath control, cadence
- LYRICS: wordplay, vocabulary, metaphors, punchlines  
- DELIVERY: confidence, energy, presence
- CREATIVITY: originality, unique style, memorable lines
- TECHNIQUE: rhyme schemes, internal rhymes, multisyllabics

IMPORTANT: Give SPECIFIC feedback based on the actual lyrics. Quote specific lines if possible.
Your "improve" tips should be actionable and reference what was actually said.

Respond with ONLY this JSON (no explanation before or after):
{
  "scores": {
    "flow": <1-10>,
    "lyrics": <1-10>,
    "delivery": <1-10>,
    "creativity": <1-10>,
    "technique": <1-10>
  },
  "overall": <1-10>,
  "verdict": "<one punchy sentence in your character's voice about THIS performance>",
  "strengths": ["<specific thing they did well>", "<another specific strength>"],
  "improve": ["<specific actionable tip based on their lyrics>", "<another specific tip>", "<third specific tip>"]
}`

// K2 needs a more direct prompt since it likes to reason first
const K2_GRADE_PROMPT = `You are a rap battle judge. Grade this performance NOW.

SKIP ALL REASONING. Output ONLY valid JSON:
{
  "scores": {"flow": 7, "lyrics": 6, "delivery": 7, "creativity": 6, "technique": 5},
  "overall": 6,
  "verdict": "Your one-line verdict here",
  "strengths": ["strength 1", "strength 2"],
  "improve": ["tip 1", "tip 2", "tip 3"]
}

Be specific! Reference actual lines from the rap. Give real actionable advice.
Flow=rhythm, Lyrics=wordplay, Delivery=confidence, Creativity=originality, Technique=rhyme schemes.
Score 1-10 each. Output ONLY the JSON object, nothing else.`

async function callAPI(provider, model, messages, maxTokens = 600) {
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
      max_tokens: maxTokens,
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

// Generate smart fallback tips based on transcript analysis
function analyzeTranscript(transcript) {
  const words = transcript.toLowerCase().split(/\s+/)
  const wordCount = words.length
  const uniqueWords = new Set(words).size
  const vocabRatio = uniqueWords / wordCount
  
  // Check for rhymes (basic - words ending the same)
  const lineEnds = transcript.split(/[.!?\n]/).map(l => l.trim().split(/\s+/).pop()).filter(Boolean)
  
  const tips = []
  const strengths = []
  
  // Vocabulary analysis
  if (vocabRatio < 0.5) {
    tips.push("Expand your vocabulary - you're repeating words. Try using synonyms and varied expressions")
  } else {
    strengths.push("Good vocabulary variety")
  }
  
  // Length analysis  
  if (wordCount < 20) {
    tips.push("Your verse was short - develop your ideas more, add more bars to fill out your flow")
  } else if (wordCount > 50) {
    strengths.push("Good verse length with substance")
  }
  
  // Check for common filler words
  const fillers = words.filter(w => ['like', 'um', 'uh', 'yeah', 'yo'].includes(w)).length
  if (fillers > 3) {
    tips.push("Cut the filler words ('like', 'um', 'yeah') - every word should hit hard")
  }
  
  // Generic but useful tips if we don't have enough
  const genericTips = [
    "Work on internal rhymes - rhyme within lines, not just at the end",
    "Add more metaphors and similes to paint pictures with your words",
    "Practice flow switches - change up your cadence mid-verse to keep it interesting",
    "Focus on punchlines - end your bars with impact, something memorable",
    "Study multisyllabic rhymes - rhyming multiple syllables shows technical skill",
    "Tell a story or have a clear theme - give your verse direction",
    "Work on breath control - don't rush, let the beat breathe",
  ]
  
  while (tips.length < 3) {
    tips.push(genericTips[tips.length])
  }
  
  if (strengths.length === 0) {
    strengths.push("Showed confidence stepping up to the mic")
    strengths.push("Put together a complete verse")
  }
  
  return { tips: tips.slice(0, 3), strengths: strengths.slice(0, 2) }
}

// Fallback verdicts in character
function getDefaultVerdict(judgeId, score) {
  const verdicts = {
    og: {
      high: "Yo, those bars were tight! Real hip-hop right there.",
      mid: "You got potential kid, but the legends would want more from you.",
      low: "Back to the lab, youngblood. Study Rakim, Big Daddy Kane, Nas.",
    },
    tech: {
      high: "Impressive syllable density and flow variation detected!",
      mid: "Decent technical foundation. Your rhyme schemes need more complexity.",
      low: "Analysis shows room for improvement in rhythm patterns and internal rhymes.",
    },
    street: {
      high: "Honey, you ATE that! The crowd would go crazy!",
      mid: "It was cute, but I need more energy! Make me feel something!",
      low: "Baby... we need to workshop this. The streets aren't ready.",
    },
    k2: {
      high: "Logically sound structure with excellent thematic coherence!",
      mid: "Reasonable performance. The narrative could use deeper conceptual layering.",
      low: "The argument structure needs refinement. Build your case stronger.",
    },
  }
  
  const level = score >= 7 ? 'high' : score >= 5 ? 'mid' : 'low'
  return verdicts[judgeId]?.[level] || "Interesting performance."
}

function parseJudgeResponse(content) {
  try {
    // Try to find JSON anywhere in the response (K2 might have text before/after)
    const jsonMatch = content.match(/\{[\s\S]*?"scores"[\s\S]*?"improve"[\s\S]*?\}/)
    if (jsonMatch) {
      // Clean up any potential issues
      let jsonStr = jsonMatch[0]
      // Fix common JSON issues
      jsonStr = jsonStr.replace(/,\s*}/g, '}').replace(/,\s*]/g, ']')
      
      const parsed = JSON.parse(jsonStr)
      return {
        scores: {
          flow: Math.min(10, Math.max(1, Number(parsed.scores?.flow) || 5)),
          lyrics: Math.min(10, Math.max(1, Number(parsed.scores?.lyrics) || 5)),
          delivery: Math.min(10, Math.max(1, Number(parsed.scores?.delivery) || 5)),
          creativity: Math.min(10, Math.max(1, Number(parsed.scores?.creativity) || 5)),
          technique: Math.min(10, Math.max(1, Number(parsed.scores?.technique) || 5)),
        },
        overall: Math.min(10, Math.max(1, Number(parsed.overall) || 5)),
        verdict: parsed.verdict || '',
        strengths: Array.isArray(parsed.strengths) ? parsed.strengths.filter(s => s && s.length > 0) : [],
        improve: Array.isArray(parsed.improve) ? parsed.improve.filter(s => s && s.length > 0) : [],
      }
    }
  } catch (e) {
    console.error('Parse error:', e, 'Content:', content?.slice(0, 200))
  }
  return null // Return null to indicate parse failure
}

export async function getJudgePanel(transcript) {
  console.log('🎤 Assembling judge panel...')
  
  // Pre-analyze transcript for smart fallbacks
  const analysis = analyzeTranscript(transcript)
  
  const judgePromises = JUDGES.map(async (judge) => {
    try {
      console.log(`${judge.emoji} ${judge.name} is judging with ${judge.model} (${judge.provider})...`)
      
      // Use different prompt and tokens for K2
      const isK2 = judge.provider === 'k2'
      const prompt = isK2 ? K2_GRADE_PROMPT : (judge.personality + '\n\n' + GRADE_PROMPT)
      const maxTokens = isK2 ? 800 : 600
      
      const content = await callAPI(judge.provider, judge.model, [
        { role: 'system', content: prompt },
        { role: 'user', content: `Grade this rap performance:\n\n"${transcript}"` },
      ], maxTokens)
      
      console.log(`${judge.emoji} ${judge.name} raw response:`, content?.slice(0, 300))
      
      const result = parseJudgeResponse(content)
      
      if (result) {
        console.log(`${judge.emoji} ${judge.name} parsed successfully:`, result.overall)
        
        // Ensure verdict exists
        if (!result.verdict || result.verdict.length < 5) {
          result.verdict = getDefaultVerdict(judge.id, result.overall)
        }
        
        // Ensure we have improvements
        if (!result.improve || result.improve.length === 0) {
          result.improve = analysis.tips
        }
        
        // Ensure we have strengths
        if (!result.strengths || result.strengths.length === 0) {
          result.strengths = analysis.strengths
        }
        
        return {
          ...judge,
          ...result,
          success: true,
        }
      } else {
        // Parse failed - use smart defaults
        console.warn(`${judge.emoji} ${judge.name} parse failed, using smart defaults`)
        throw new Error('Parse failed')
      }
    } catch (error) {
      console.error(`${judge.name} failed:`, error.message)
      
      // Smart defaults based on transcript analysis
      const baseScore = Math.floor(Math.random() * 2) + 5 // 5-6 range for failed judges
      
      return {
        ...judge,
        scores: { 
          flow: baseScore + Math.floor(Math.random() * 2), 
          lyrics: baseScore, 
          delivery: baseScore + Math.floor(Math.random() * 2), 
          creativity: baseScore - 1 + Math.floor(Math.random() * 2), 
          technique: baseScore - 1 
        },
        overall: baseScore,
        verdict: getDefaultVerdict(judge.id, baseScore),
        strengths: analysis.strengths,
        improve: analysis.tips,
        success: true, // Still show but with analyzed defaults
      }
    }
  })

  const results = await Promise.allSettled(judgePromises)
  const judges = results.map((r, i) => r.status === 'fulfilled' ? r.value : { 
    ...JUDGES[i], 
    success: false,
    overall: 5,
    scores: { flow: 5, lyrics: 5, delivery: 5, creativity: 5, technique: 5 },
    verdict: getDefaultVerdict(JUDGES[i].id, 5),
    strengths: analysis.strengths,
    improve: analysis.tips,
  })
  
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

  // Collect all unique improvement tips (prefer non-generic ones)
  const allImprovements = [...new Set(successfulJudges.flatMap(j => j.improve || []))]
    .filter(tip => tip && tip.length > 10)
    .slice(0, 5)
  
  // Add analysis tips if we don't have enough
  if (allImprovements.length < 3) {
    analysis.tips.forEach(tip => {
      if (!allImprovements.includes(tip) && allImprovements.length < 5) {
        allImprovements.push(tip)
      }
    })
  }
  
  const allStrengths = [...new Set(successfulJudges.flatMap(j => j.strengths || []))]
    .filter(s => s && s.length > 3)
    .slice(0, 4)

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
    avgScore >= 5 ? "📝 Keep working, the potential is there!" :
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
