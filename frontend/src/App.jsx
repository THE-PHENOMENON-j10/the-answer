import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import confetti from 'canvas-confetti';

export default function TheAnswerApp() {
  const [theme, setTheme] = useState('dark'); 
  const [step, setStep] = useState(1); 
  const [user, setUser] = useState('');
  const [questMode, setQuestMode] = useState('Custom'); // Tracks 'Custom', 'GST212', or 'History'
  const [menuOpen, setMenuOpen] = useState(false);      // Tracks if the hamburger menu is open
  const [files, setFiles] = useState([]);
  // Added 'duration' (in minutes) to the main config state
  const [config, setConfig] = useState({ count: 10, type: 'MCQ', duration: 10 });
  const [quizData, setQuizData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  
  const [userAnswers, setUserAnswers] = useState({});
  const [score, setScore] = useState(0);

  const [history, setHistory] = useState([]);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [selectedSession, setSelectedSession] = useState(null);
  
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

  // Updated to use the selected user duration instead of calculating by question count
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

    // --- 1. BOUNCER CHECKS (ONLY FOR CUSTOM QUESTS) ---
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

    // --- 2. PREPARE THE DATA ---
    setLoading(true);
    const formData = new FormData();
    
    // Only attach files if we are on the Custom route
    if (questMode === 'Custom') {
      files.forEach(f => formData.append('files', f));
    }
    
    formData.append('username', user);
    formData.append('numQuestions', config.count);
    formData.append('type', config.type);
    formData.append('mode', questMode); // <-- THE NEW SIGNAL FOR THE BACKEND

    // --- 3. SEND TO RENDER ---
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
      userAnswers: userAnswers
    };

    const updatedHistory = [newSession, ...history];
    setHistory(updatedHistory);
    localStorage.setItem('the_answer_history', JSON.stringify(updatedHistory));

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
        
        {history.length === 0 ? (
          <p style={{opacity: 0.5, fontStyle: 'italic'}}>No past answers documented yet.</p>
        ) : (
          history.map((session) => (
            <div key={session.id} className="history-item" onClick={() => setSelectedSession(session)}>
              <div style={{fontWeight: 'bold', color: '#7000ff'}}>{session.score} / {session.totalQuestions}</div>
              <div style={{fontSize: '0.8rem', opacity: 0.6, marginTop: '5px'}}>{session.date}</div>
            </div>
          ))
        )}
      </div>

      {selectedSession && (
        <div className="modal-overlay" onClick={() => setSelectedSession(null)}>
          <div className="glass-card" style={{maxWidth: '700px', maxHeight: '80%', overflowY: 'auto', textAlign: 'left'}} onClick={e => e.stopPropagation()}>
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px'}}>
              <h3 className="mystic-title" style={{fontSize: '1.2rem', margin: 0}}>SESSION REVIEW</h3>
              <button className="menu-close-btn" onClick={() => setSelectedSession(null)}>✕</button>
            </div>
            <p style={{opacity: 0.7, fontSize: '0.9rem', marginBottom: '20px'}}>Achieved standard: <strong>{selectedSession.score} / {selectedSession.totalQuestions}</strong> on {selectedSession.date}</p>
            <hr style={{borderColor: 'rgba(120, 120, 120, 0.2)', marginBottom: '20px'}} />
            
            <div>
              {selectedSession.quiz.map((q, i) => {
                const picked = selectedSession.userAnswers[i];
                const correct = q.answer;
                const isCorrect = picked === correct;

                return (
                  <div key={i} style={{marginBottom: '20px', paddingBottom: '15px', borderBottom: '1px solid rgba(120,120,120,0.1)'}}>
                    <p style={{fontWeight: 'bold', margin: '0 0 10px 0'}}>{i + 1}. {q.question}</p>
                    <div style={{fontSize: '0.9rem'}}>
                      <div style={{color: isCorrect ? '#00c853' : '#ff3d00', marginBottom: '4px'}}>
                        <strong>Picked Answer:</strong> {picked || <span style={{opacity: 0.5}}>[No choice made]</span>}
                      </div>
                      <div style={{color: '#00c853'}}>
                        <strong>Correct Answer:</strong> {correct}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
      {/* --- THE HAMBURGER MENU --- */}
      <div style={{ position: 'absolute', top: '20px', left: '20px', zIndex: 100 }}>
        <button 
          onClick={() => setMenuOpen(!menuOpen)}
          style={{ background: 'none', border: 'none', color: 'white', fontSize: '2rem', cursor: 'pointer' }}
        >
          ☰
        </button>
        
        {menuOpen && (
          <div className="glass-card" style={{ position: 'absolute', top: '50px', left: '0', width: '200px', display: 'flex', flexDirection: 'column', gap: '10px', padding: '15px' }}>
            <button className="main-btn" onClick={() => { setQuestMode('Custom'); setMenuOpen(false); if(step !== 1 && step !== 2) setStep(2); }}>
              Custom Quest
            </button>
            <button className="main-btn" onClick={() => { setQuestMode('GST212'); setMenuOpen(false); if(step !== 1 && step !== 2) setStep(2); }} style={{ background: 'linear-gradient(45deg, #ffd700, #ff8c00)', color: 'black' }}>
              Course: GST212
            </button>
            <button className="main-btn" onClick={() => { setQuestMode('History'); setMenuOpen(false); }} style={{ background: 'transparent', border: '1px solid white' }}>
              Quest History
            </button>
          </div>
        )}
      </div>
      {/* --------------------------- */}

      {step === 1 && (
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

      {step === 2 && questMode !== 'History' && (
        <div className="glass-card">
          <h2 className="mystic-title" style={{fontSize: '1.5rem'}}>
            {questMode === 'GST212' ? 'GST212 FAST-TRACK' : `WELCOME, ${user.toUpperCase()}`}
          </h2>
          
          {/* ONLY SHOW FILE UPLOAD IF IN CUSTOM MODE */}
          {questMode === 'Custom' && (
            <div className="pro-input-group">
              <span className="input-label">1. Knowledge Scrolls</span>
              <p style={{ fontSize: '0.85rem', opacity: 0.7, margin: '5px 0 10px 0', fontStyle: 'italic' }}>
                * Note: The combined weight of all scrolls must not exceed 10MB.
              </p>
              <input type="file" multiple onChange={handleFileSelection} />
            </div>
          )}

          {/* ... Your existing 3-column grid for Intensity, Format, and Duration stays exactly the same here ... */}
          
          {/* Changed layout grid to 3 columns to handle the new selection elegantly */}
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
             {/* New Duration Selection Field */}
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

      {step === 3 && quizData && (
        <div className="glass-card" style={{maxWidth: '800px'}}>
           <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '20px'}}>
              <span style={{color: timeLeft < 60 ? '#ff4b4b' : '#7000ff', fontWeight: 'bold'}}>⏳ {formatTime(timeLeft)}</span>
              <span className="input-label">THE ANSWER</span>
           </div>
           <div style={{textAlign: 'left', maxHeight: '400px', overflowY: 'auto', paddingRight: '10px'}}>
              {quizData.quiz.map((q, i) => (
                <div key={i} style={{marginBottom: '30px', borderBottom: '1px solid rgba(120,120,120,0.1)', paddingBottom: '20px'}}>
                  <p style={{fontWeight: 'bold'}}>{i+1}. {q.question}</p>
                  
                  {config.type === 'MCQ' ? (
                    <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px'}}>
                      {q.options.map(o => (
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

      {step === 4 && (
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