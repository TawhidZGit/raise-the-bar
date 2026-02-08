import { useState, useEffect } from 'react'
import { useScribe } from '@elevenlabs/react'
import './App.css'

const API_KEY = import.meta.env.VITE_ELEVEN_LABS_API_KEY

function App() {
  const [transcript, setTranscript] = useState('')
  const [partialTranscript, setPartialTranscript] = useState('')
  const [error, setError] = useState(null)

  // Use the official ElevenLabs Scribe hook
  const scribe = useScribe({
    onConnect: () => {
      console.log('Scribe connected!')
      setError(null)
    },
    onDisconnect: () => {
      console.log('Scribe disconnected')
    },
    onError: (err) => {
      console.error('Scribe error:', err)
      setError(err.message || 'Connection error')
    },
    // Try different callback names
    onTranscript: (data) => {
      console.log('onTranscript:', data)
    },
    onPartialTranscript: (data) => {
      console.log('onPartialTranscript:', data)
      setPartialTranscript(data.text || data || '')
    },
    onCommittedTranscript: (data) => {
      console.log('onCommittedTranscript:', data)
      const text = data.text || data || ''
      setTranscript(prev => {
        const newText = prev ? prev + ' ' + text : text
        return newText.trim()
      })
      setPartialTranscript('')
    },
  })

  // Log all scribe state changes
  useEffect(() => {
    console.log('Scribe state:', {
      status: scribe.status,
      transcript: scribe.transcript,
      partialTranscript: scribe.partialTranscript,
    })
    
    // Use scribe's built-in transcript if available
    if (scribe.transcript) {
      setTranscript(scribe.transcript)
    }
    if (scribe.partialTranscript) {
      setPartialTranscript(scribe.partialTranscript)
    }
  }, [scribe.status, scribe.transcript, scribe.partialTranscript])

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
      console.log('Getting token...')
      const token = await getToken()
      console.log('Got token, connecting...')
      
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

  const stopRecording = () => {
    console.log('Stopping recording...')
    scribe.disconnect()
    setPartialTranscript('')
  }

  const clearTranscript = () => {
    setTranscript('')
    setPartialTranscript('')
  }

  const copyToClipboard = () => {
    navigator.clipboard.writeText(transcript)
  }

  const isRecording = scribe.status === 'connected' || scribe.status === 'transcribing'
  const isConnecting = scribe.status === 'connecting'

  // Use SDK's transcript values as fallback
  const displayTranscript = transcript || scribe.transcript || ''
  const displayPartial = partialTranscript || scribe.partialTranscript || ''

  return (
    <div className="app">
      <div className="background-gradient"></div>
      <div className="noise-overlay"></div>
      
      <header className="header">
        <h1 className="title">
          <span className="title-icon">◉</span>
          Voice Scribe
        </h1>
        <span className="status-badge">{scribe.status}</span>
      </header>

      <main className="main">
        <div className="microphone-section">
          <button 
            className={`mic-button ${isRecording ? 'recording' : ''} ${isConnecting ? 'connecting' : ''}`}
            onClick={isRecording ? stopRecording : startRecording}
            disabled={isConnecting}
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
            {isConnecting && 'Connecting...'}
            {isRecording && 'Listening... (speak now)'}
            {scribe.status === 'disconnected' && 'Click to start'}
          </p>
        </div>

        {error && (
          <div className="error-banner">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="12"/>
              <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            <span>{error}</span>
            <button onClick={() => setError(null)} className="error-dismiss">×</button>
          </div>
        )}

        <div className="transcript-container">
          <div className="transcript-header">
            <h2>Transcript</h2>
            <div className="transcript-actions">
              <button onClick={copyToClipboard} className="action-btn" title="Copy to clipboard" disabled={!displayTranscript}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                </svg>
              </button>
              <button onClick={clearTranscript} className="action-btn" title="Clear transcript" disabled={!displayTranscript && !displayPartial}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="3,6 5,6 21,6"/>
                  <path d="M19,6v14a2,2,0,0,1-2,2H7a2,2,0,0,1-2-2V6m3,0V4a2,2,0,0,1,2-2h4a2,2,0,0,1,2,2V6"/>
                </svg>
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
                  ? "Speak now... your words will appear here"
                  : "Your transcription will appear here in real-time as you speak..."}
              </span>
            )}
          </div>
        </div>

        <div className="info-cards">
          <div className="info-card">
            <div className="info-icon">⚡</div>
            <div className="info-content">
              <h4>~150ms Latency</h4>
              <p>Ultra-low latency real-time transcription</p>
            </div>
          </div>
          <div className="info-card">
            <div className="info-icon">🌍</div>
            <div className="info-content">
              <h4>90+ Languages</h4>
              <p>Powered by Scribe v2 Realtime</p>
            </div>
          </div>
          <div className="info-card">
            <div className="info-icon">🎯</div>
            <div className="info-content">
              <h4>Word-level Accuracy</h4>
              <p>Precise timestamps for every word</p>
            </div>
          </div>
        </div>
      </main>

      <footer className="footer">
        <p>Powered by <a href="https://elevenlabs.io" target="_blank" rel="noopener noreferrer">ElevenLabs</a> Scribe v2 Realtime</p>
      </footer>
    </div>
  )
}

export default App
