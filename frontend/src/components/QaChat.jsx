import React, { useState, useEffect, useRef } from 'react';
import { api } from '../context/AuthContext.jsx';
import { Send, FileText, Check, ShieldAlert } from 'lucide-react';

const QaChat = ({ patientId }) => {
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [sending, setSending] = useState(false);
  
  const chatHistoryRef = useRef(null);

  // Initialize/Reset conversation when patient selection shifts
  useEffect(() => {
    setMessages([
      {
        sender: 'ai',
        text: 'Hello! I am your evidence-based medical record assistant. You can ask me questions about this patient\'s treatment history, medications, diagnostics, or trends, and I will search their files for direct evidence.',
        isSystem: true
      }
    ]);
    setInputValue('');
    setSending(false);
  }, [patientId]);

  // Autoscroll chat history to focus on fresh replies
  useEffect(() => {
    if (chatHistoryRef.current) {
      chatHistoryRef.current.scrollTop = chatHistoryRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!inputValue.trim() || sending) return;

    const userQuestion = inputValue.trim();
    setInputValue('');
    setSending(true);

    // 1. Render User message bubble
    setMessages(prev => [...prev, { sender: 'user', text: userQuestion }]);

    // 2. Render AI thinking state bubble
    setMessages(prev => [...prev, { sender: 'ai', loading: true }]);

    try {
      // 3. Request answer from RAG pipeline
      const res = await api.post('/ask', {
        patientId,
        question: userQuestion
      });

      const responseData = res.data.data;

      // 4. Overwrite thinking state bubble with structured AI details
      setMessages(prev => {
        const updated = [...prev];
        const lastIdx = updated.length - 1;
        updated[lastIdx] = {
          sender: 'ai',
          text: responseData.answer,
          evidence: responseData.evidence,
          confidence: responseData.confidence,
          riskLevel: responseData.risk_level,
          recommendation: responseData.recommendation
        };
        return updated;
      });

    } catch (err) {
      console.error('[QA Request Failed]', err.message);
      setMessages(prev => {
        const updated = [...prev];
        const lastIdx = updated.length - 1;
        updated[lastIdx] = {
          sender: 'ai',
          text: 'Sorry, I encountered an error while retrieving the patient context. Please verify the backend connection and try again.'
        };
        return updated;
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="chat-container">
      {/* Messages Feed */}
      <div className="chat-history" ref={chatHistoryRef}>
        {messages.map((msg, index) => (
          <div 
            key={index} 
            className={`chat-bubble ${msg.sender === 'user' ? 'user' : 'ai'}`}
          >
            {msg.loading ? (
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', padding: '4px' }}>
                <div className="spinner-primary" style={{ width: '16px', height: '16px', borderTopColor: 'var(--color-primary-hover)' }}></div>
                <span style={{ fontSize: '13px', color: 'var(--color-text-muted)', fontStyle: 'italic' }}>Consulting medical record index...</span>
              </div>
            ) : (
              <div>
                <p style={{ margin: 0 }}>{msg.text}</p>
                
                {/* AI Detail Panels for Evidential Citation & Safety */}
                {msg.sender === 'ai' && !msg.isSystem && msg.evidence && (
                  <div className="ai-details-wrapper">
                    <div className="ai-meta-row">
                      <span className="ai-meta-label">Source Evidence:</span>
                      <span className="ai-meta-val" style={{ display: 'flex', alignItems: 'center', gap: '4px', fontStyle: 'italic', fontWeight: 400 }}>
                        <FileText size={12} />
                        {msg.evidence}
                      </span>
                    </div>

                    {msg.confidence !== undefined && (
                      <div className="ai-meta-row">
                        <span className="ai-meta-label">Extraction Confidence:</span>
                        <span className="ai-meta-val" style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--color-primary)' }}>
                          <Check size={12} />
                          {msg.confidence}%
                        </span>
                      </div>
                    )}

                    {msg.riskLevel && (
                      <div className="ai-meta-row">
                        <span className="ai-meta-label">Safety Risk Level:</span>
                        <span className={`ai-meta-val ${msg.riskLevel.toLowerCase()}`}>
                          {msg.riskLevel}
                        </span>
                      </div>
                    )}

                    {msg.recommendation && (
                      <div 
                        className="disclaimer-banner"
                        style={{ display: 'flex', gap: '6px', alignItems: 'flex-start', margin: '8px 0 0 0' }}
                      >
                        <ShieldAlert size={14} style={{ flexShrink: 0, marginTop: '2px', color: '#92400e' }} />
                        <span><strong>Clinical Note:</strong> {msg.recommendation}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Input Bar */}
      <form onSubmit={handleSend} className="chat-input-area">
        <input
          type="text"
          className="chat-input"
          placeholder="Ask e.g. Has this patient taken Paracetamol?"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          disabled={sending}
        />
        <button 
          type="submit" 
          className="btn-primary" 
          style={{ width: '45px', height: '45px', padding: 0 }}
          disabled={sending || !inputValue.trim()}
        >
          <Send size={16} />
        </button>
      </form>
    </div>
  );
};

export default QaChat;
