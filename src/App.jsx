import { useState, useEffect } from 'react'
import { useScribe } from '@elevenlabs/react'
import { saveTranscript, updateTranscriptGrade } from './supabase'
import { gradeRapBattle } from './k2'
import './App.css'

const API_KEY = import.meta.env.VITE_ELEVEN_LABS_API_KEY

function App() {
  const [transcript, setTranscript] = useState('')
  const [partialTranscript, setPartialTranscript] = useState('')
  const [error, setError] = useState(null)
  const [savedTranscripts, setSavedTranscripts] = useState([])
  const [saving, setSaving] = useState(false)
  const [grading, setGrading] = useState(false)
  const [currentGrade, setCurrentGrade] = useState(null)

  // Use the official ElevenLabs Scribe hook
  const scribe = useScribe({
    onConnect: () => {
      console.log('Scribe connected!')
      setError(null)
      setCurrentGrade(null)
    },
    onDisconnect: () => {
      console.log('Scribe disconnected')
    },
    onError: (err) => {
      console.error('Scribe error:', err)
      setError(err.message || 'Connection error')
    },
    onTranscript: (data) => {
      console.log('onTranscript:', data)
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

  // Sync with scribe's built-in transcript
  useEffect(() => {
    if (scribe.partialTranscript) {
      setPartialTranscript(scribe.partialTranscript)
    }
  }, [scribe.partialTranscript])

  // Get token from ElevenLabs API
  const getToken = async () => {
    const response = await fetch('https://api.elevenlabs.io/v1/single-use-token/realtime_scribe', {
      method: 'POST',
      headers: {
        'xi-api-key': API_KEY,
      },
    })
    
    if (!response.ok) {
      throw new Error('Failed to get token')
    }
    
    const data = await response.json()
    return data.token
  }

  const startRecording = async () => {
    if (!API_KEY) {
      setError('Missing VITE_ELEVEN_LABS_API_KEY')
      return
    }

    try {
      setError(null)
      setTranscript('')
      setPartialTranscript('')
      setCurrentGrade(null)
      
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
    console.log('Stopping recording...')
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
        console.log('Saved to Supabase:', savedRecord)
      } catch (err) {
        console.error('Failed to save:', err)
        setError('Failed to save transcript')
        setSaving(false)
        return
      }
      setSaving(false)
      
      // Grade with K2
      setGrading(true)
      try {
        const grade = await gradeRapBattle(finalText)
        console.log('Grade received:', grade)
        setCurrentGrade(grade)
        
        // Update Supabase with grade
        if (savedRecord?.id) {
          await updateTranscriptGrade(
            savedRecord.id, 
            `${grade.grade} (${grade.score}/10)`,
            `${grade.verdict} ${grade.feedback}`
          )
          savedRecord.grade = `${grade.grade} (${grade.score}/10)`
          savedRecord.feedback = `${grade.verdict} ${grade.feedback}`
        }
        
        setSavedTranscripts(prev => [savedRecord, ...prev])
      } catch (err) {
        console.error('Failed to grade:', err)
        setError('Failed to grade performance')
        setSavedTranscripts(prev => [savedRecord, ...prev])
      } finally {
        setGrading(false)
      }
    }
  }

  const clearTranscript = () => {
    setTranscript('')
    setPartialTranscript('')
    setCurrentGrade(null)
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
          Rap Battle Judge
        </h1>
        <span className="status-badge">
          {grading ? '🤔 judging...' : saving ? '💾 saving...' : scribe.status}
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
            {isRecording && '🔥 Spit your bars! (click to stop)'}
            {saving && '💾 Saving...'}
            {grading && '🎯 AI Judge is grading...'}
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
              <button onClick={copyToClipboard} className="action-btn" title="Copy" disabled={!displayTranscript}>
                📋
              </button>
              <button onClick={clearTranscript} className="action-btn" title="Clear" disabled={!displayTranscript && !displayPartial}>
                🗑️
              </button>
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
                {isRecording 
                  ? "🎤 The mic is hot... drop your bars!"
                  : "Your verse will appear here as you spit..."}
              </span>
            )}
          </div>
        </div>

        {/* Grade Display */}
        {currentGrade && (
          <div className="grade-container">
            <div className="grade-header">
              <div className="grade-score">
                <span className="grade-letter">{currentGrade.grade}</span>
                <span className="grade-number">{currentGrade.score}/10</span>
              </div>
              <h3>Judge's Verdict</h3>
            </div>
            <p className="grade-verdict">{currentGrade.verdict}</p>
            <p className="grade-feedback">{currentGrade.feedback}</p>
          </div>
        )}

        {grading && (
          <div className="grade-container grading">
            <div className="grading-spinner">🎯</div>
            <p>The AI judge is analyzing your performance...</p>
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
            <div className="info-icon">⚡</div>
            <div className="info-content">
              <h4>Real-time</h4>
              <p>Live transcription</p>
            </div>
          </div>
          <div className="info-card">
            <div className="info-icon">🤖</div>
            <div className="info-content">
              <h4>AI Judge</h4>
              <p>K2 Think grades your bars</p>
            </div>
          </div>
          <div className="info-card">
            <div className="info-icon">💾</div>
            <div className="info-content">
              <h4>History</h4>
              <p>All battles saved</p>
            </div>
          </div>
        </div>
      </main>

      <footer className="footer">
        <p>Powered by ElevenLabs • K2 Think AI • Supabase</p>
      </footer>
    </div>
  )
}

export default App
