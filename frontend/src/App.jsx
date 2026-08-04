import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import confetti from 'canvas-confetti';

export default function TheAnswerApp() {
  const [theme, setTheme] = useState('dark'); 
  const [step, setStep] = useState(1); 
  const [user, setUser] = useState('');
  const [questMode, setQuestMode] = useState('Custom'); // Tracks 'Custom', 'GST212', or 'History'
  const [files, setFiles] = useState([]);
  const [config, setConfig] = useState({ count: 10, type: 'MCQ', duration: 10 });
  const [quizData, setQuizData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  
  const [userAnswers, setUserAnswers] = useState({});
  const [score, setScore] = useState(0);

  const [history, setHistory] = useState([]);
  const [selectedSession, setSelectedSession] = useState(null);
  
  // FIXED: Declared missing states that were used in the UI
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [selectedReview, setSelectedReview] = useState(null);
  
  const timerRef = useRef(null);

  useEffect(() => {
    const rememberedUser = localStorage.getItem('the_answer_user');
    if (rememberedUser) {
      setUser(rememberedUser);
      setStep(2);
    }
    const savedHistory = localStorage.getItem('the_answer_history');
    if (savedHistory) {
      setHistory(JSON.parse(savedHistory));
    }
  }, []);

  const handleStart = () => {
    if (user.trim()) {
      localStorage.setItem('the_answer_user', user);
      setStep(2);
    }
  };

  const handleFileSelection = (e) => {
    const selectedFiles = [...e.target.files];
    
    if (selectedFiles.length > 15) {
      alert("The maximum number of scrolls (files) is 15. Please select fewer files.");
      e.target.value = null; 
      setFiles([]); 
    } else {
      setFiles(selectedFiles);
    }
  };

  const startTimer = (minutes) => {
    const seconds = minutes * 60;
    setTimeLeft(seconds);
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          finishQuiz(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const handleUpload = async (e) => {
    if (e) e.preventDefault(); 

    if (questMode === 'Custom') {
      if (files.length === 0) return alert("Please select your scrolls.");
      if (files.length > 15) return alert("Maximum of 15 scrolls allowed.");

      let totalSize = 0;
      for (let i = 0; i < files.length; i++) {
        totalSize += files[i].size;
      }
      
      if (totalSize > 10485760) {
        alert("These scrolls are too heavy! THE ANSWER can only process up to 10MB at a time.");
        return; 
      }
    }

    setLoading(true);
    const formData = new FormData();
    
    if (questMode === 'Custom') {
      files.forEach(f => formData.append('files', f));
    }
    
    formData.append('username', user);
    formData.append('numQuestions', config.count);
    formData.append('type', config.type);
    formData.append('mode', questMode);

    try {
      const res = await axios.post('https://the-answer.onrender.com/generate-quiz', formData);
      setQuizData(res.data);
      setStep(3);
      startTimer(config.duration);
    } catch (err) {
      console.error(err);
      alert("The mystical connection failed.");
    }
    setLoading(false);
  };

  const handleAnswerChange = (questionIndex, answer) => {
    setUserAnswers(prev => ({
      ...prev,
      [questionIndex]: answer
    }));
  };

  const finishQuiz = (isTimeUp = false) => {
    clearInterval(timerRef.current);
    if (isTimeUp) alert("TIME ELAPSED. THE ANSWER HAS SPOKEN.");
    
    let calculatedScore = 0;
    if (quizData && quizData.quiz) {
      quizData.quiz.forEach((q, index) => {
        if (userAnswers[index] === q.answer) {
          calculatedScore += 1;
        }
      });
    }
    setScore(calculatedScore);

    const newSession = {
      id: Date.now(),
      date: new Date().toLocaleString(),
      score: calculatedScore,
      totalQuestions: quizData?.quiz?.length || 0,
      quiz: quizData.quiz,
      userAnswers: userAnswers,
      mode: questMode
    };

    const updatedHistory = [newSession, ...history];
    setHistory(updatedHistory);
    localStorage.setItem('the_answer_history', JSON.stringify(updatedHistory));
    localStorage.setItem('quest_history', JSON.stringify(updatedHistory)); // Sync with archive mode fallback

    confetti({ particleCount: 200, spread: 80 });
    setStep(4);
  };

  const resetSession = () => {
    setStep(2);
    setUserAnswers({});
    setScore(0);
    setQuizData(null);
    setFiles([]);
  };

  const isDark = theme === 'dark';

  return (
    <div className={`app-wrapper ${isDark ? 'dark-mode' : 'light-mode'}`}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@700&family=Inter:wght@300;500;700&display=swap');
        
        .app-wrapper {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: 'Inter', sans-serif;
          position: relative;
          overflow: hidden;
          transition: background 1s ease;
        }

        .atmosphere {
          position: absolute;
          top: 0; left: 0; width: 100%; height: 100%;
          z-index: 1;
          filter: blur(100px);
          opacity: 0.6;
          animation: rotateAtmosphere 20s infinite linear;
        }

        .blob {
          position: absolute;
          width: 600px; height: 600px;
          border-radius: 50%;
          mix-blend-mode: screen;
          animation: moveBlobs 15s infinite alternate;
        }

        .dark-mode .blob-1 { background: #4b0082; top: -10%; left: -10%; }
        .dark-mode .blob-2 { background: #00008b; bottom: -10%; right: -10%; animation-delay: -5s; }
        .dark-mode .blob-3 { background: #7000ff; top: 40%; left: 30%; width: 400px; animation-delay: -2s; }
        .dark-mode { background: #050505; color: #fff; }

        .light-mode .blob-1 { background: #ffdeeb; top: -10%; left: -10%; }
        .light-mode .blob-2 { background: #d0e7ff; bottom: -10%; right: -10%; animation-delay: -5s; }
        .light-mode .blob-3 { background: #e6e0ff; top: 40%; left: 30%; width: 400px; animation-delay: -2s; }
        .light-mode { background: #fdfdfd; color: #222; }

        @keyframes moveBlobs {
          from { transform: translate(0, 0) scale(1); }
          to { transform: translate(100px, 50px) scale(1.2); }
        }

        @keyframes rotateAtmosphere {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        .glass-card {
          background: ${isDark ? 'rgba(10, 10, 10, 0.75)' : 'rgba(255, 255, 255, 0.8)'};
          backdrop-filter: blur(40px);
          border: 1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'};
          padding: 40px;
          border-radius: 32px;
          width: 90%;
          max-width: 600px;
          z-index: 2;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
          text-align: center;
        }

        .mystic-title {
          font-family: 'Cinzel', serif;
          letter-spacing: 8px;
          background: linear-gradient(to bottom right, #7000ff, #00d4ff);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .main-btn {
          padding: 16px 32px;
          border-radius: 50px;
          border: none;
          background: #7000ff;
          color: white;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .main-btn:hover {
          transform: translateY(-5px);
          box-shadow: 0 15px 30px rgba(112, 0, 255, 0.4);
        }

        .top-action-bar {
          position: absolute; top: 30px; right: 30px; left: 30px; z-index: 100; 
          display: flex; justify-content: space-between; align-items: center;
        }

        .toggle-container { display: flex; align-items: center; gap: 10px; }

        .switch { position: relative; display: inline-block; width: 50px; height: 26px; }
        .switch input { opacity: 0; width: 0; height: 0; }
        .slider { position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: #333; transition: .4s; border-radius: 34px; }
        .slider:before { position: absolute; content: ""; height: 18px; width: 18px; left: 4px; bottom: 4px; background-color: white; transition: .4s; border-radius: 50%; }
        input:checked + .slider { background-color: #7000ff; }
        input:checked + .slider:before { transform: translateX(24px); }

        .pro-input-group { background: rgba(120, 120, 120, 0.05); padding: 20px; border-radius: 20px; margin: 15px 0; text-align: left; }
        .input-label { font-size: 0.7rem; text-transform: uppercase; letter-spacing: 2px; color: #7000ff; font-weight: bold; margin-bottom: 8px; display: block; }
        .pro-select { width: 100%; padding: 12px; background: transparent; border: 1px solid rgba(120, 120, 120, 0.2); color: inherit; border-radius: 10px; outline: none; }
        
        .dark-mode .pro-select option {
          background: #151515;
          color: #ffffff;
        }
        .light-mode .pro-select option {
          background: #ffffff;
          color: #222222;
        }
        
        .menu-btn {
          background: transparent; border: none; font-size: 1.8rem; color: inherit; cursor: pointer; padding: 5px;
        }
        
        .side-menu {
          position: fixed; top: 0; left: 0; width: 320px; height: 100%; 
          background: ${isDark ? 'rgba(15, 15, 15, 0.95)' : 'rgba(245, 245, 245, 0.95)'};
          backdrop-filter: blur(20px);
          box-shadow: 5px 0 25px rgba(0,0,0,0.3);
          z-index: 200; transform: translateX(-100%); transition: transform 0.4s cubic-bezier(0.77,0.2,0.05,1.0);
          padding: 30px 20px; box-sizing: border-box; text-align: left; overflow-y: auto;
          border-right: 1px solid rgba(120, 120, 120, 0.1);
        }
        
        .side-menu.open { transform: translateX(0); }
        
        .menu-close-btn { background: transparent; border: none; font-size: 1.5rem; color: inherit; cursor: pointer; float: right; }
        
        .history-item {
          padding: 15px; border-radius: 12px; background: rgba(120, 120, 120, 0.08); margin-bottom: 12px; cursor: pointer; transition: background 0.2s;
        }
        .history-item:hover { background: rgba(112, 0, 255, 0.15); }

        .modal-overlay {
          position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); 
          z-index: 300; display: flex; align-items: center; justify-content: center; backdrop-filter: blur(5px);
        }
      `}</style>

      <div className="atmosphere">
        <div className="blob blob-1"></div>
        <div className="blob blob-2"></div>
        <div className="blob blob-3"></div>
      </div>

      <div className="top-action-bar">
        <button className="menu-btn" onClick={() => setIsMenuOpen(true)}>☰</button>
        <div className="toggle-container">
          <span style={{fontSize: '1.2rem'}}>{isDark ? '🌙' : '☀️'}</span>
          <label className="switch">
            <input type="checkbox" checked={!isDark} onChange={() => setTheme(isDark ? 'light' : 'dark')} />
            <span className="slider"></span>
          </label>
        </div>
      </div>

      <div className={`side-menu ${isMenuOpen ? 'open' : ''}`}>
        <button className="menu-close-btn" onClick={() => setIsMenuOpen(false)}>✕</button>
        <h3 className="mystic-title" style={{fontSize: '1.2rem', marginTop: '10px', marginBottom: '30px'}}>QUEST HISTORY</h3>
        
        <button 
          className="main-btn" 
          style={{ width: '100%', padding: '10px', marginBottom: '15px', fontSize: '0.85rem' }}
          onClick={() => { setQuestMode('History'); setIsMenuOpen(false); }}
        >
          📂 View Archives Panel
        </button>

        {history.length === 0 ? (
          <p style={{opacity: 0.5, fontStyle: 'italic'}}>No past answers documented yet.</p>
        ) : (
          history.map((session) => (
            <div key={session.id} className="history-item" onClick={() => { setSelectedSession(session); setIsMenuOpen(false); }}>
              <div style={{fontWeight: 'bold', color: '#7000ff'}}>{session.score} / {session.totalQuestions}</div>
              <div style={{fontSize: '0.8rem', opacity: 0.6, marginTop: '5px'}}>{session.date}</div>
            </div>
          ))
        )}
      </div>

      {/* --- SIDE MENU POPUP REVIEW MODAL --- */}
      {selectedSession && (
        <div className="modal-overlay" onClick={() => setSelectedSession(null)}>
          <div className="glass-card" style={{maxWidth: '700px', maxHeight: '80%', overflowY: 'auto', textAlign: 'left'}} onClick={e => e.stopPropagation()}>
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px'}}>
              <h3 className="mystic-title" style={{fontSize: '1.2rem', margin: 0}}>SESSION REVIEW</h3>
              <button className="menu-close-btn" onClick={() => setSelectedSession(null)}>✕</button>
            </div>
            <p style={{opacity: 0.7, fontSize: '0.9rem', marginBottom: '20px'}}>Achieved standard: <strong>{selectedSession.score} / {selectedSession.totalQuestions}</strong> on {selectedSession.date}</p>
            <hr style={{borderColor: 'rgba(120, 120, 120, 0.2)', marginBottom: '20px'}} />
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              {selectedSession.quiz && selectedSession.quiz.map((q, i) => {
                const picked = selectedSession.userAnswers[i];
                const correct = q.answer;
                const isCorrect = picked === correct;

                return (
                  <div key={i} style={{ background: 'rgba(120,120,120,0.05)', padding: '15px', borderRadius: '12px', borderLeft: `4px solid ${isCorrect ? '#00ffcc' : '#ff4d4d'}` }}>
                    <p style={{ fontWeight: 'bold', marginBottom: '5px' }}>{i + 1}. {q.question}</p>
                    <p style={{ fontSize: '0.9rem', margin: '3px 0' }}>Your choice: <span style={{ color: isCorrect ? '#00ffcc' : '#ff4d4d', fontWeight: 'bold' }}>{picked || "Unanswered"}</span></p>
                    {!isCorrect && <p style={{ fontSize: '0.9rem', margin: '3px 0', color: '#00ffcc' }}>Correct: {correct}</p>}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* --- TOP RIGHT CONTROLS FOR ACTIVE WORKSPACE --- */}
      <div style={{ position: 'absolute', top: '20px', right: '120px', display: 'flex', alignItems: 'center', gap: '15px', zIndex: 100 }}>
  <button 
    className="main-btn"
    onClick={() => {
      if (questMode === 'History') {
        setQuestMode('Custom');
      } else {
        setQuestMode(questMode === 'Custom' ? 'GST212' : 'Custom');
      }
    }}
    style={{
      // Dynamically switches colors based on the theme state
      background: questMode === 'GST212' 
        ? 'linear-gradient(45deg, #ffd700, #ff8c00)' 
        : (theme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)'),
      color: questMode === 'GST212' 
        ? 'black' 
        : (theme === 'dark' ? 'white' : '#222'),
      border: theme === 'dark' ? '1px solid rgba(255, 255, 255, 0.2)' : '1px solid rgba(0, 0, 0, 0.15)',
      fontSize: '0.85rem',
      fontWeight: 'bold',
      padding: '8px 15px',
      borderRadius: '20px',
      cursor: 'pointer',
    }}
  >
    {questMode === 'GST212' ? '🎓 GST212 ACTIVE' : questMode === 'History' ? '📁 RETURN TO SETUP' : '📁 SWITCH TO GST212'}
  </button>
</div>

      {/* --- WORKSPACE STEPS --- */}
      {questMode !== 'History' && step === 1 && (
        <div className="glass-card">
          <h1 className="mystic-title">THE ANSWER</h1>
          <p style={{opacity: 0.7, marginBottom: '30px'}}>Identify yourself to begin.</p>
          <input 
            className="pro-select" 
            style={{textAlign: 'center', fontSize: '1.2rem', marginBottom: '20px'}}
            placeholder="Your name..." 
            value={user}
            onChange={e => setUser(e.target.value)} 
          />
          <button className="main-btn" onClick={handleStart}>Seek Truth</button>
        </div>
      )}

      {questMode !== 'History' && step === 2 && (
        <div className="glass-card">
          <h2 className="mystic-title" style={{fontSize: '1.5rem'}}>
            {questMode === 'GST212' ? 'GST212 FAST-TRACK' : `WELCOME, ${user.toUpperCase()}`}
          </h2>
          
          {questMode === 'Custom' ? (
            <div className="pro-input-group">
              <span className="input-label">1. Knowledge Scrolls</span>
              <p style={{ fontSize: '0.85rem', opacity: 0.7, margin: '5px 0 10px 0', fontStyle: 'italic' }}>
                * Note: The combined weight of all scrolls must not exceed 10MB.
              </p>
              <input type="file" multiple onChange={handleFileSelection} />
            </div>
          ) : (
            <div style={{ padding: '15px', margin: '15px 0', borderRadius: '8px', background: 'rgba(255, 215, 0, 0.05)', border: '1px solid rgba(255, 215, 0, 0.2)', textAlign: 'center' }}>
              <p style={{ margin: 0, fontSize: '0.9rem', color: '#ffd700' }}>
                ✨ The internal GST212 Knowledge Vault has been unlocked. No scrolls required.
              </p>
            </div>
          )}

          <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px'}}>
             <div className="pro-input-group" style={{padding: '15px'}}>
               <span className="input-label">2. Intensity</span>
               <select className="pro-select" value={config.count} onChange={e => setConfig({...config, count: parseInt(e.target.value)})}>
                 <option value="10">10 Qs</option>
                 <option value="20">20 Qs</option>
                 <option value="50">50 Qs</option>
                 <option value="100">100 Qs</option>
               </select>
             </div>
             <div className="pro-input-group" style={{padding: '15px'}}>
               <span className="input-label">3. Format</span>
               <select className="pro-select" value={config.type} onChange={e => setConfig({...config, type: e.target.value})}>
                 <option value="MCQ">MCQ</option>
                 <option value="Theory">Theory</option>
               </select>
             </div>
             <div className="pro-input-group" style={{padding: '15px'}}>
               <span className="input-label">4. Duration</span>
               <select className="pro-select" value={config.duration} onChange={e => setConfig({...config, duration: parseInt(e.target.value)})}>
                 <option value="5">5 min</option>
                 <option value="10">10 min</option>
                 <option value="20">20 min</option>
                 <option value="30">30 min</option>
                 <option value="40">40 min</option>
                 <option value="60">1 hr</option>
               </select>
             </div>
          </div>
          <button className="main-btn" style={{width: '100%', marginTop: '10px'}} onClick={handleUpload} disabled={loading}>
            {loading ? "TRANSCENDING..." : "START QUEST"}
          </button>
        </div>
      )}

      {/* --- INLINE FULL SCREEN ARCHIVES WINDOW --- */}
      {questMode === 'History' && (
        <div className="glass-card" style={{ marginTop: '60px', maxHeight: '80vh', overflowY: 'auto' }}>
          {selectedReview ? (
            <div>
              <button 
                onClick={() => setSelectedReview(null)} 
                style={{ background: 'transparent', color: '#00ffcc', border: '1px solid #00ffcc', padding: '5px 10px', borderRadius: '5px', cursor: 'pointer', marginBottom: '15px' }}
              >
                ← Back to Archives
              </button>
              <h2 className="mystic-title" style={{ fontSize: '1.2rem' }}>
                REVIEW: {selectedReview.mode === 'GST212' ? 'GST212' : 'CUSTOM QUEST'} ({selectedReview.score} Points)
              </h2>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginTop: '20px', textAlign: 'left' }}>
                {selectedReview.quiz && selectedReview.quiz.map((q, index) => {
                  const userPicked = selectedReview.userAnswers[index];
                  const isCorrect = userPicked === q.answer;

                  return (
                    <div key={index} style={{ background: 'rgba(0,0,0,0.3)', padding: '15px', borderRadius: '8px', borderLeft: `4px solid ${isCorrect ? '#00ffcc' : '#ff4d4d'}` }}>
                      <p style={{ fontWeight: 'bold', marginBottom: '10px' }}>{index + 1}. {q.question}</p>
                      
                      <div style={{ fontSize: '0.9rem', marginBottom: '5px' }}>
                        <span style={{ opacity: 0.7 }}>Your Answer: </span>
                        <span style={{ color: isCorrect ? '#00ffcc' : '#ff4d4d', fontWeight: 'bold' }}>
                          {userPicked || "Skipped"}
                        </span>
                      </div>
                      
                      {!isCorrect && (
                        <div style={{ fontSize: '0.9rem' }}>
                          <span style={{ opacity: 0.7 }}>Correct Answer: </span>
                          <span style={{ color: '#00ffcc', fontWeight: 'bold' }}>{q.answer}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div>
              <h2 className="mystic-title" style={{ fontSize: '1.5rem' }}>ARCHIVE OF COMPLETED QUESTS</h2>
              {(() => {
                const storedHistory = JSON.parse(localStorage.getItem('the_answer_history')) || [];
                
                if (storedHistory.length === 0) {
                  return (
                    <p style={{ textAlign: 'center', opacity: 0.7, fontStyle: 'italic', padding: '20px' }}>
                      No past trials found in your local scrolls yet...
                    </p>
                  );
                }

                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {storedHistory.map((item) => (
                      <div 
                        key={item.id} 
                        onClick={() => setSelectedReview(item)}
                        style={{ border: '1px solid rgba(255,255,255,0.2)', padding: '12px', borderRadius: '8px', display: 'flex', justifycontent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.05)', cursor: 'pointer', transition: '0.2s' }}
                        onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                        onMouseOut={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                      >
                        <div style={{ textAlign: 'left' }}>
                          <span style={{ fontWeight: 'bold', color: item.mode === 'GST212' ? '#ffd700' : '#fff' }}>
                            {item.mode === 'GST212' ? '🎓 GST212 FAST-TRACK' : '🏆 CUSTOM QUEST'}
                          </span>
                          <div style={{ fontSize: '0.8rem', opacity: 0.6, marginTop: '4px' }}>{item.date}</div>
                        </div>
                        <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#00ffcc' }}>
                          {item.score} / {item.totalQuestions}
                        </div>
                      </div>
                    ))}
                    
                    <button 
                      className="main-btn" 
                      style={{ background: 'rgba(255, 77, 77, 0.2)', border: '1px solid #ff4d4d', color: '#ff4d4d', marginTop: '10px' }}
                      onClick={() => {
                        if(window.confirm("Are you sure you want to wipe all records from your local scrolls?")) {
                          localStorage.removeItem('the_answer_history');
                          localStorage.removeItem('quest_history');
                          setHistory([]);
                          setQuestMode('Custom');
                          setStep(2); 
                        }
                      }}
                    >
                      WIPE CHRONICLES
                    </button>
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      )}

      {questMode !== 'History' && step === 3 && quizData && (
        <div className="glass-card" style={{maxWidth: '800px'}}>
           <div style={{display: 'flex', justifycontent: 'space-between', marginBottom: '20px'}}>
              <span style={{color: timeLeft < 60 ? '#ff4b4b' : '#7000ff', fontWeight: 'bold'}}>⏳ {formatTime(timeLeft)}</span>
              <span className="input-label">THE ANSWER</span>
           </div>
           <div style={{textAlign: 'left', maxHeight: '400px', overflowY: 'auto', paddingRight: '10px'}}>
              {quizData.quiz.map((q, i) => (
                <div key={i} style={{marginBottom: '30px', borderBottom: '1px solid rgba(120,120,120,0.1)', paddingBottom: '20px'}}>
                  <p style={{fontWeight: 'bold'}}>{i+1}. {q.question}</p>
                  
                  {config.type === 'MCQ' ? (
                    <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px'}}>
                      {q.options && q.options.map(o => (
                        <label key={o} style={{padding: '10px', background: 'rgba(120,120,120,0.05)', borderRadius: '8px', cursor: 'pointer'}}>
                          <input 
                            type="radio" 
                            name={`q${i}`} 
                            checked={userAnswers[i] === o}
                            onChange={() => handleAnswerChange(i, o)}
                          /> {o}
                        </label>
                      ))}
                    </div>
                  ) : (
                    <textarea 
                      className="pro-select" 
                      placeholder="Enter your answer..." 
                      value={userAnswers[i] || ''}
                      onChange={(e) => handleAnswerChange(i, e.target.value)}
                    />
                  )}
                </div>
              ))}
           </div>
           <button className="main-btn" style={{width: '100%', marginTop: '20px'}} onClick={() => finishQuiz(false)}>CONCLUDE</button>
        </div>
      )}

      {questMode !== 'History' && step === 4 && (
        <div className="glass-card">
          <h1 className="mystic-title">COMPLETED</h1>
          <div style={{padding: '30px', background: 'rgba(112,0,255,0.05)', borderRadius: '20px', margin: '20px 0'}}>
             <h2 style={{fontSize: '2.5rem', margin: '0 0 10px 0', color: '#7000ff'}}>
               {score} <span style={{fontSize: '1rem', color: isDark ? '#fff' : '#222'}}>/ {quizData?.quiz?.length || 0}</span>
             </h2>
             <p style={{fontStyle: 'italic'}}>"The knowledge is now yours. Go forth."</p>
             <p style={{textAlign: 'right', fontWeight: 'bold', color: '#7000ff'}}>— THE PHENOMENON</p>
          </div>
          <button className="main-btn" onClick={resetSession}>New Session</button>
        </div>
      )}
    </div>
  );
}