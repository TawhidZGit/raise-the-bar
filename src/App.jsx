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
            .map(j => `${j.emoji} ${j.name}: ${j.comment}`)
            .join(' | ')
          
          await updateTranscriptGrade(savedRecord.id, gradeStr, feedback)
          savedRecord.grade = gradeStr
          savedRecord.feedback = feedback
        }
        
        setSavedTranscripts(prev => [savedRecord, ...prev])
      } catch (err) {
        console.error('Failed to grade:', err)
        setError('Judges unavailable')
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

  return (
    <div className="app">
      <div className="background-gradient"></div>
      <div className="noise-overlay"></div>
      
      <header className="header">
        <h1 className="title">
          <span className="title-icon">🎤</span>
          Rap Battle Arena
        </h1>
        <span className="status-badge">
          {grading ? '⚖️ judging' : saving ? '💾' : scribe.status}
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

        {/* Judge Panel Results */}
        {judgeResults && (
          <div className="judge-panel">
            <div className="panel-header">
              <div className="final-score">
                <span className="score-letter">{judgeResults.gradeLetter}</span>
                <span className="score-number">{judgeResults.avgScore}/10</span>
              </div>
              <h3>Judge Panel Verdict</h3>
            </div>
            
            <div className="judges-grid">
              {judgeResults.judges.map((judge) => (
                <div key={judge.id} className={`judge-card ${judge.success ? '' : 'unavailable'}`}>
                  <div className="judge-header">
                    <span className="judge-emoji">{judge.emoji}</span>
                    <span className="judge-name">{judge.name}</span>
                    {judge.success && (
                      <span className="judge-score">{judge.score}/10</span>
                    )}
                  </div>
                  <p className="judge-comment">{judge.comment}</p>
                  <span className="judge-model">{judge.model.split('/')[1]}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {grading && (
          <div className="judge-panel grading">
            <div className="grading-animation">
              <span>🎤</span><span>🤖</span><span>👑</span>
            </div>
            <p>The judge panel is deliberating...</p>
          </div>
        )}

        {savedTranscripts.length > 0 && (
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

        <div className="info-cards">
          <div className="info-card">
            <div className="info-icon">🎤</div>
            <div className="info-content">
              <h4>OG Mike</h4>
              <p>DeepSeek V3</p>
            </div>
          </div>
          <div className="info-card">
            <div className="info-icon">🤖</div>
            <div className="info-content">
              <h4>DJ Neural</h4>
              <p>Llama 3.3 70B</p>
            </div>
          </div>
          <div className="info-card">
            <div className="info-icon">👑</div>
            <div className="info-content">
              <h4>Queen Bars</h4>
              <p>Qwen 2.5 72B</p>
            </div>
          </div>
        </div>
      </main>

      <footer className="footer">
        <p>ElevenLabs • Featherless AI • Supabase</p>
      </footer>
    </div>
  )
}

export default App
