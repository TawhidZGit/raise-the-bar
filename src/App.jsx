import { useState, useEffect } from 'react'
import { useScribe } from '@elevenlabs/react'
import { saveTranscript, updateTranscriptGrade } from './supabase'
import { getJudgePanel } from './featherless'
import './App.css'

const API_KEY = import.meta.env.VITE_ELEVEN_LABS_API_KEY

function App() {
  const [transcript, setTranscript] = useState('')
  const [partialTranscript, setPartialTranscript] = useState('')
  const [error, setError] = useState(null)
  const [savedTranscripts, setSavedTranscripts] = useState([])
  const [saving, setSaving] = useState(false)
  const [grading, setGrading] = useState(false)
  const [judgeResults, setJudgeResults] = useState(null)

  const scribe = useScribe({
    onConnect: () => {
      console.log('Scribe connected!')
      setError(null)
      setJudgeResults(null)
    },
    onDisconnect: () => {
      console.log('Scribe disconnected')
    },
    onError: (err) => {
      console.error('Scribe error:', err)
      setError(err.message || 'Connection error')
    },
    onPartialTranscript: (data) => {
      setPartialTranscript(data.text || data || '')
    },
    onCommittedTranscript: (data) => {
      const text = data.text || data || ''
      setTranscript(prev => {
        const newText = prev ? prev + ' ' + text : text
        return newText.trim()
      })
      setPartialTranscript('')
    },
  })

  useEffect(() => {
    if (scribe.partialTranscript) {
      setPartialTranscript(scribe.partialTranscript)
    }
  }, [scribe.partialTranscript])

  const getToken = async () => {
    const response = await fetch('https://api.elevenlabs.io/v1/single-use-token/realtime_scribe', {
      method: 'POST',
      headers: { 'xi-api-key': API_KEY },
    })
    if (!response.ok) throw new Error('Failed to get token')
    const data = await response.json()
    return data.token
  }

  const startRecording = async () => {
    if (!API_KEY) {
      setError('Missing API key')
      return
    }

    try {
      setError(null)
      setTranscript('')
      setPartialTranscript('')
      setJudgeResults(null)
      
      const token = await getToken()
      await scribe.connect({
        token,
        modelId: 'scribe_v2_realtime',
        languageCode: 'en',
        microphone: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      })
    } catch (err) {
      console.error('Start error:', err)
      setError(err.message)
    }
  }

  const stopRecording = async () => {
    scribe.disconnect()
    
    const finalText = (transcript + ' ' + partialTranscript).trim()
    setPartialTranscript('')
    
    if (finalText && finalText.length > 10) {
      setTranscript(finalText)
      
      // Save to Supabase
      setSaving(true)
      let savedRecord = null
      try {
        const saved = await saveTranscript(finalText)
        savedRecord = saved[0]
        console.log('Saved to Supabase:', saved)
      } catch (err) {
        console.error('Failed to save:', err)
        setError('Failed to save')
        setSaving(false)
        return
      }
      setSaving(false)
      
      // Get judge panel verdicts
      setGrading(true)
      try {
        const results = await getJudgePanel(finalText)
        console.log('Judge panel results:', results)
        setJudgeResults(results)
        
        // Update Supabase with grade
        if (savedRecord?.id) {
          const gradeStr = `${results.gradeLetter} (${results.avgScore}/10)`
          const feedback = results.judges
            .filter(j => j.success)
            .map(j => `${j.emoji} ${j.name}: ${j.verdict}`)
            .join(' | ')
          
          await updateTranscriptGrade(savedRecord.id, gradeStr, feedback)
          savedRecord.grade = gradeStr
          savedRecord.feedback = feedback
        }
        
        setSavedTranscripts(prev => [savedRecord, ...prev])
      } catch (err) {
        console.error('Failed to grade:', err)
        setError('Judges unavailable - check API key')
        setSavedTranscripts(prev => [savedRecord, ...prev])
      } finally {
        setGrading(false)
      }
    }
  }

  const clearTranscript = () => {
    setTranscript('')
    setPartialTranscript('')
    setJudgeResults(null)
  }

  const copyToClipboard = () => {
    navigator.clipboard.writeText(transcript)
  }

  const isRecording = scribe.status === 'connected' || scribe.status === 'transcribing'
  const isConnecting = scribe.status === 'connecting'
  const isBusy = isConnecting || saving || grading

  const displayTranscript = transcript || ''
  const displayPartial = partialTranscript || scribe.partialTranscript || ''

  const categoryLabels = {
    flow: '🌊 Flow',
    lyrics: '✍️ Lyrics', 
    delivery: '🎭 Delivery',
    creativity: '💡 Creativity',
    technique: '🔧 Technique',
  }

  return (
    <div className="app">
      <div className="background-gradient"></div>
      <div className="noise-overlay"></div>
      
      <header className="header">
        <h1 className="title">
          <span className="title-icon">🎤</span>
          Raise The Bar
        </h1>
        <span className="status-badge">
          {grading ? '⚖️ judging' : saving ? '💾 saving' : scribe.status}
        </span>
      </header>

      <main className="main">
        <div className="microphone-section">
          <button 
            className={`mic-button ${isRecording ? 'recording' : ''} ${isConnecting ? 'connecting' : ''}`}
            onClick={isRecording ? stopRecording : startRecording}
            disabled={isBusy && !isRecording}
          >
            <div className="mic-pulse"></div>
            <div className="mic-pulse delay-1"></div>
            <div className="mic-pulse delay-2"></div>
            <svg className="mic-icon" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              {isRecording ? (
                <rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor"/>
              ) : (
                <>
                  <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"/>
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                  <line x1="12" y1="19" x2="12" y2="22"/>
                </>
              )}
            </svg>
          </button>
          <p className="status-text">
            {isConnecting && '🔌 Connecting...'}
            {isRecording && '🔥 Spit your bars!'}
            {saving && '💾 Saving...'}
            {grading && '⚖️ Panel is judging...'}
            {!isBusy && !isRecording && '👆 Drop your verse'}
          </p>
        </div>

        {error && (
          <div className="error-banner">
            <span>⚠️ {error}</span>
            <button onClick={() => setError(null)} className="error-dismiss">×</button>
          </div>
        )}

        <div className="transcript-container">
          <div className="transcript-header">
            <h2>🎙️ Your Bars</h2>
            <div className="transcript-actions">
              <button onClick={copyToClipboard} className="action-btn" title="Copy" disabled={!displayTranscript}>📋</button>
              <button onClick={clearTranscript} className="action-btn" title="Clear" disabled={!displayTranscript}>🗑️</button>
            </div>
          </div>
          <div className="transcript-content">
            {displayTranscript || displayPartial ? (
              <>
                <span className="final-text">{displayTranscript}</span>
                {displayPartial && (
                  <span className="partial-text">{displayTranscript ? ' ' : ''}{displayPartial}</span>
                )}
              </>
            ) : (
              <span className="placeholder-text">
                {isRecording ? "🎤 The mic is hot..." : "Your verse appears here..."}
              </span>
            )}
          </div>
        </div>

        {/* Grading Animation */}
        {grading && (
          <div className="judge-panel grading">
            <div className="grading-animation">
              <span>🎤</span><span>🤖</span><span>👑</span>
            </div>
            <p>The judge panel is deliberating...</p>
          </div>
        )}

        {/* Judge Panel Results */}
        {judgeResults && (
          <div className="results-container">
            {/* Main Score Card */}
            <div className="main-score-card">
              <div className="score-circle">
                <span className="grade-letter">{judgeResults.gradeLetter}</span>
                <span className="grade-number">{judgeResults.avgScore}/10</span>
              </div>
              <div className="score-info">
                <h2>Ensemble Verdict</h2>
                <p className="verdict-message">{judgeResults.verdictMessage}</p>
              </div>
            </div>

            {/* Category Breakdown */}
            <div className="category-breakdown">
              <h3>📊 Score Breakdown</h3>
              <div className="category-bars">
                {Object.entries(judgeResults.avgScores).map(([key, value]) => (
                  <div key={key} className="category-row">
                    <span className="category-label">{categoryLabels[key]}</span>
                    <div className="category-bar-container">
                      <div 
                        className="category-bar-fill" 
                        style={{ width: `${value * 10}%` }}
                      />
                    </div>
                    <span className="category-value">{value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Individual Judges */}
            <div className="judges-section">
              <h3>🎤 Judge Panel</h3>
              <div className="judges-grid">
                {judgeResults.judges.map((judge) => (
                  <div key={judge.id} className={`judge-card ${judge.success ? '' : 'unavailable'}`}>
                    <div className="judge-card-header">
                      <span className="judge-emoji">{judge.emoji}</span>
                      <div className="judge-info">
                        <span className="judge-name">{judge.name}</span>
                        <span className="judge-model">{judge.model.split('/')[1]}</span>
                      </div>
                      {judge.success && (
                        <span className="judge-overall">{judge.overall}/10</span>
                      )}
                    </div>
                    
                    {judge.success && (
                      <>
                        <p className="judge-verdict">"{judge.verdict}"</p>
                        
                        <div className="judge-scores">
                          {Object.entries(judge.scores).map(([key, val]) => (
                            <div key={key} className="mini-score">
                              <span className="mini-label">{key.slice(0,3).toUpperCase()}</span>
                              <span className="mini-value">{val}</span>
                            </div>
                          ))}
                        </div>

                        {judge.strengths?.length > 0 && (
                          <div className="judge-strengths">
                            <span className="strength-label">💪 Strengths:</span>
                            {judge.strengths.map((s, i) => (
                              <span key={i} className="strength-tag">{s}</span>
                            ))}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Improvement Tips */}
            {judgeResults.improvements?.length > 0 && (
              <div className="improvements-section">
                <h3>📈 Level Up Your Bars</h3>
                <div className="improvements-list">
                  {judgeResults.improvements.map((tip, i) => (
                    <div key={i} className="improvement-item">
                      <span className="improvement-number">{i + 1}</span>
                      <span className="improvement-text">{tip}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Strengths Summary */}
            {judgeResults.strengths?.length > 0 && (
              <div className="strengths-section">
                <h3>🔥 What You Did Right</h3>
                <div className="strengths-list">
                  {judgeResults.strengths.map((strength, i) => (
                    <span key={i} className="strength-pill">✓ {strength}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Battle History */}
        {savedTranscripts.length > 0 && !judgeResults && (
          <div className="saved-section">
            <h3>📜 Battle History</h3>
            <div className="saved-list">
              {savedTranscripts.slice(0, 5).map((t, i) => (
                <div key={t.id || i} className="saved-item">
                  <div className="saved-item-header">
                    {t.grade && <span className="saved-grade">{t.grade}</span>}
                    <span className="saved-time">{new Date(t.created_at).toLocaleTimeString()}</span>
                  </div>
                  <span className="saved-text">{t.text.substring(0, 80)}{t.text.length > 80 ? '...' : ''}</span>
                  {t.feedback && <span className="saved-feedback">{t.feedback}</span>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Info Cards - Only show when no results */}
        {!judgeResults && !grading && (
          <div className="info-cards">
            <div className="info-card">
              <div className="info-icon">🎤</div>
              <div className="info-content">
                <h4>OG Mike</h4>
                <p>DeepSeek V3 • Old School Judge</p>
              </div>
            </div>
            <div className="info-card">
              <div className="info-icon">🤖</div>
              <div className="info-content">
                <h4>DJ Neural</h4>
                <p>Llama 3.3 70B • Technical Analyst</p>
              </div>
            </div>
            <div className="info-card">
              <div className="info-icon">👑</div>
              <div className="info-content">
                <h4>Queen Bars</h4>
                <p>Qwen 2.5 72B • Battle Veteran</p>
              </div>
            </div>
          </div>
        )}
      </main>

      <footer className="footer">
        <p>ElevenLabs • Featherless AI • Supabase</p>
      </footer>
    </div>
  )
}

export default App
