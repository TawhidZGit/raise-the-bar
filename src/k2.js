const K2_API_KEY = import.meta.env.VITE_K2_API_KEY

export async function gradeRapBattle(transcript) {
  const response = await fetch('https://api.k2think.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${K2_API_KEY}`,
      'accept': 'application/json',
    },
    body: JSON.stringify({
      model: 'MBZUAI-IFM/K2-Think-v2',
      messages: [
        {
          role: 'system',
          content: `You are a legendary rap battle judge with decades of experience in hip-hop culture. 
You grade performances on a scale of 1-10 and provide brief, punchy feedback like a real battle rap judge would.

Grade based on:
- Flow & Rhythm (how smooth and on-beat)
- Wordplay & Punchlines (clever bars, double meanings)
- Delivery & Confidence
- Creativity & Originality

Respond in this exact JSON format:
{
  "score": <number 1-10>,
  "grade": "<letter grade A+ to F>",
  "verdict": "<one bold sentence verdict>",
  "feedback": "<2-3 sentences of specific feedback in hip-hop judge style>"
}`
        },
        {
          role: 'user',
          content: `Grade this rap battle performance:\n\n"${transcript}"`
        }
      ],
      stream: false,
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    console.error('K2 API error:', error)
    throw new Error('Failed to grade performance')
  }

  const data = await response.json()
  const content = data.choices?.[0]?.message?.content || ''
  
  console.log('K2 response:', content)
  
  // Try to parse JSON from response
  try {
    // Find JSON in the response
    const jsonMatch = content.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0])
    }
  } catch (e) {
    console.error('Failed to parse K2 response as JSON:', e)
  }
  
  // Fallback if JSON parsing fails
  return {
    score: 5,
    grade: 'C',
    verdict: 'Performance recorded.',
    feedback: content || 'Unable to grade this performance.'
  }
}

