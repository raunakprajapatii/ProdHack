import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  AlertCircle,
  BookOpen,
  Brain,
  CheckCircle,
  Copy,
  FileText,
  Home,
  Rocket,
  Sparkles,
  Swords,
  Timer,
  Trophy,
  Upload,
  Users
} from 'lucide-react';
import io from 'socket.io-client';
import './One.css';

// Store items - duplicated from backend for client-side theme matching
const storeItems = [
  { 
    id: 'classic-clock', 
    name: 'Classic Clock', 
    type: 'Clock', 
    price: 150, 
    badge: 'CLK', 
    description: 'A clean starter clock skin for focus rounds.',
    timerTheme: {
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      timerColor: '#ffffff',
      accentColor: '#fbbf24',
      secondaryColor: '#ffffff'
    }
  },
  { 
    id: 'neon-grid', 
    name: 'Neon Grid', 
    type: 'Theme', 
    price: 300, 
    badge: 'NEO', 
    description: 'Electric cyan and magenta dashboard energy.',
    timerTheme: {
      background: 'radial-gradient(circle at 18% 12%, rgba(0, 245, 255, 0.28), transparent 28%), radial-gradient(circle at 78% 8%, rgba(255, 46, 247, 0.24), transparent 24%), linear-gradient(135deg, #050712 0%, #0c1024 48%, #13071d 100%)',
      timerColor: '#67e8f9',
      accentColor: '#ff2ef7',
      secondaryColor: '#facc15'
    }
  },
  { 
    id: 'forest-focus', 
    name: 'Forest Focus', 
    type: 'Theme', 
    price: 350, 
    badge: 'FOR', 
    description: 'Deep green theme for calm study sessions.',
    timerTheme: {
      background: 'radial-gradient(circle at 20% 30%, rgba(34, 197, 94, 0.2), transparent 30%), radial-gradient(circle at 80% 70%, rgba(16, 185, 129, 0.15), transparent 20%), linear-gradient(135deg, #064e3b 0%, #0f766e 48%, #115e59 100%)',
      timerColor: '#10b981',
      accentColor: '#34d399',
      secondaryColor: '#6ee7b7'
    }
  },
  { 
    id: 'galaxy-run', 
    name: 'Galaxy Run', 
    type: 'Theme', 
    price: 450, 
    badge: 'GAL', 
    description: 'Space-inspired theme with cosmic contrast.',
    timerTheme: {
      background: 'radial-gradient(circle at 10% 20%, rgba(255, 0, 255, 0.1), transparent 30%), radial-gradient(circle at 80% 50%, rgba(0, 255, 255, 0.1), transparent 30%), linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%)',
      timerColor: '#a78bfa',
      accentColor: '#f472b6',
      secondaryColor: '#fb923c'
    }
  },
  { 
    id: 'pomodoro-pro', 
    name: 'Pomodoro Pro', 
    type: 'Clock', 
    price: 500, 
    badge: 'PPO', 
    description: 'Professional pomodoro timer with customizable intervals and sound effects.',
    timerTheme: {
      background: 'linear-gradient(135deg, #8b5cf6 0%, #d946ef 100%)',
      timerColor: '#fdd835',
      accentColor: '#ff6b6b',
      secondaryColor: '#4cc9f0'
    },
    features: ['custom-intervals', 'sound-effects', 'session-history']
  },
  { 
    id: 'zen-master', 
    name: 'Zen Master', 
    type: 'Theme', 
    price: 400, 
    badge: 'ZEN', 
    description: 'Minimalist zen theme with breathing animations and nature sounds.',
    timerTheme: {
      background: 'linear-gradient(135deg, #84fab0 0%, #8fd3f4 100%)',
      timerColor: '#2c3e50',
      accentColor: '#27ae60',
      secondaryColor: '#f39c12'
    },
    features: ['breathing-animation', 'nature-sounds', 'minimalist-design']
  },
  { 
    id: 'lofi-pack', 
    name: 'Lofi Playlist Pack', 
    type: 'Playlist', 
    price: 200, 
    badge: '+5', 
    description: 'Unlock 5 saved playlist slots.' 
  },
  { 
    id: 'deep-work-pack', 
    name: 'Deep Work Playlist Pack', 
    type: 'Playlist', 
    price: 350, 
    badge: '+10', 
    description: 'Unlock 10 saved playlist slots.' 
  },
  { 
    id: 'xp-spark', 
    name: 'XP Spark Booster', 
    type: 'Booster', 
    price: 250, 
    badge: '2X', 
    description: 'A premium boost cosmetic for your account.' 
  }
];

// Connect to the backend server
const socket = io("http://localhost:3000", {
  transports: ['websocket'],
  upgrade: false,
});

export default function OneOne() {
  const { roomIdFromUrl } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const storedHostRoomId = typeof window !== 'undefined'
    ? window.sessionStorage.getItem('hostRoomId')
    : '';

  // --- CONNECTION & ROOM STATES ---
  const [isHost, setIsHost] = useState(
    location.state?.isHost || !roomIdFromUrl || storedHostRoomId === roomIdFromUrl
  );
  const [roomId, setRoomId] = useState(roomIdFromUrl || '');
  const [opponentConnected, setOpponentConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState(
    socket.connected ? 'connected' : 'connecting'
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [sessionState, setSessionState] = useState(!roomIdFromUrl ? 'lobby' : 'waiting');
  const [joinRoomId, setJoinRoomId] = useState('');

  // --- PDF & QUIZ DATA ---
  const [topics, setTopics] = useState([]);
  const [quizData, setQuizData] = useState([]);
  const [studyDuration, setStudyDuration] = useState(15);
  const [timeLeft, setTimeLeft] = useState(studyDuration * 60);

  // --- USER STORE DATA ---
  const [, setUserStore] = useState({
    wallet: 0,
    ownedItems: ['classic-clock'],
    equippedItems: { Theme: '', Playlist: '', Booster: '', Clock: 'classic-clock' },
    playlist: { limit: 0, songs: [] }
  });

  // --- TIMER THEME STATE ---
  const [timerTheme, setTimerTheme] = useState({
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    timerColor: '#ffffff',
    accentColor: '#fbbf24',
    secondaryColor: '#ffffff'
  });

  // --- QUIZ STATES ---
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [quizAnswered, setQuizAnswered] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState('');
  const [showResult, setShowResult] = useState(false);
  const [player1QuizScore, setPlayer1QuizScore] = useState(0);
  const [player2QuizScore, setPlayer2QuizScore] = useState(0);
  const [currentPlayer, setCurrentPlayer] = useState('Player 1');
  const [isMyTurn, setIsMyTurn] = useState(true);
  const [rewardMessage, setRewardMessage] = useState('');
  const [roomClosingMessage, setRoomClosingMessage] = useState('');
  const rewardClaimedRef = useRef(false);

  // --- PLAYER DATA ---
  const [opponentName, setOpponentName] = useState('Player 2');

  // --- CONNECTION STATUS ---
  useEffect(() => {
    if (socket.connected) {
      setConnectionStatus('connected');
      setError('');
    }

    socket.on('connect', () => {
      console.log('✅ Connected to server');
      setConnectionStatus('connected');
      setError('');
    });

    socket.on('disconnect', () => {
      console.log('❌ Disconnected from server');
      setConnectionStatus('disconnected');
      setError('Connection lost. Attempting to reconnect...');
    });

    socket.on('connect_error', (error) => {
      console.error('Connection error:', error);
      setConnectionStatus('error');
      setError('Failed to connect to server. Please check if the server is running.');
    });

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('connect_error');
    };
  }, []);

  // --- UPDATE TIMER THEME BASED ON EQUIPPED ITEMS ---
  const updateTimerTheme = useCallback((equippedItems, itemCatalog = storeItems) => {
    // Find equipped clock item
    const equippedClockId = equippedItems.Clock || 'classic-clock';
    const equippedThemeId = equippedItems.Theme || '';
    
    // Find the equipped items in storeItems to get their themes
    let clockTheme = itemCatalog.find(item => item.id === equippedClockId)?.timerTheme;
    let themeTheme = itemCatalog.find(item => item.id === equippedThemeId)?.timerTheme;
    
    // Prioritize theme over clock if both are equipped, otherwise use clock
    const finalTheme = themeTheme || clockTheme || itemCatalog.find(item => item.id === 'classic-clock')?.timerTheme;
    
    if (finalTheme) {
      setTimerTheme(finalTheme);
    }
  }, []);

  // --- FETCH USER STORE DATA ---
  useEffect(() => {
    const fetchUserStore = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;

        const [response, itemsResponse] = await Promise.all([
          fetch('http://localhost:3000/api/store/me', {
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
          }),
          fetch('http://localhost:3000/api/store/items'),
        ]);

        const itemsData = itemsResponse.ok ? await itemsResponse.json() : null;
        const itemCatalog = itemsData?.items || storeItems;

        if (response.ok) {
          const data = await response.json();
          setUserStore(data);
          
          // Update timer theme based on equipped clock/theme
          updateTimerTheme(data.equippedItems, itemCatalog);
        }
      } catch (err) {
        console.error('Failed to fetch user store:', err);
      }
    };

    fetchUserStore();
  }, [updateTimerTheme]);

  // --- SOCKET EVENT HANDLERS ---
  useEffect(() => {
    if (!roomIdFromUrl || isHost) return;

    console.log('🔄 Attempting to join room:', roomIdFromUrl);
    socket.emit('joinRoom', { roomId: roomIdFromUrl, playerName: 'Player 2' });

    return () => {
      // Cleanup handled in main socket effect
    };
  }, [roomIdFromUrl, isHost]);

  useEffect(() => {
    // Player joined events
    socket.on('playerJoined', ({ playerName }) => {
      console.log('👥 Player joined:', playerName);
      setOpponentName(playerName || 'Player 2');
      setOpponentConnected(true);
      if (isHost) {
        setSessionState('idle');
      }
    });

    socket.on('joinedRoom', ({ roomId: joinedRoomId }) => {
      console.log('✅ Successfully joined room:', joinedRoomId);
      setIsHost(false);
      setRoomId(joinedRoomId);
      setSessionState('idle');
      setOpponentConnected(true);
      setIsLoading(false);
      window.sessionStorage.removeItem('hostRoomId');
    });

    socket.on('roomReady', () => {
      console.log('🎮 Room is ready for battle');
      setOpponentConnected(true);
      setSessionState('idle');
    });

    // Game action events
    socket.on('opponentAction', ({ action, payload }) => {
      console.log('🎮 Received opponent action:', action, payload);
      
      switch (action) {
        case 'pdfAnalyzed':
          setTopics(payload.topics || []);
          setQuizData(payload.quiz || []);
          setStudyDuration(payload.studyDuration || 15);
          break;
        case 'startSession':
          setTimeLeft(payload.studyTime);
          setSessionState('studying');
          break;
        case 'quizStarted':
          setSessionState('quizzing');
          setCurrentQuestionIndex(0);
          setCurrentPlayer('Player 1');
          setPlayer1QuizScore(0);
          setPlayer2QuizScore(0);
          rewardClaimedRef.current = false;
          setRewardMessage('');
          setIsMyTurn(isHost); // Host goes first
          break;
        case 'nextQuestion':
          setCurrentQuestionIndex(payload.questionIndex);
          setCurrentPlayer(payload.currentPlayer);
          setIsMyTurn(payload.isMyTurn);
          setQuizAnswered(false);
          setSelectedAnswer('');
          setShowResult(false);
          break;
        case 'quizEnded':
          setPlayer1QuizScore(payload.player1Score);
          setPlayer2QuizScore(payload.player2Score);
          setSessionState('results');
          break;
      }
    });

    // Quiz answer events
    socket.on('opponentQuizAnswer', ({ questionIndex, answer, isCorrect, player }) => {
      console.log('📝 Opponent answered:', { questionIndex, answer, isCorrect, player });
      // Update opponent's score if needed
      if (isCorrect && player === 'Player 2') {
        setPlayer2QuizScore(s => s + 1);
      }
    });

    socket.on('scoreUpdate', ({ player1Score = 0, player2Score = 0 }) => {
      setPlayer1QuizScore(player1Score);
      setPlayer2QuizScore(player2Score);
    });

    // Error and disconnect events
    socket.on('joinError', (message) => {
      console.error('❌ Join error:', message);
      setError(message);
      setSessionState('lobby');
      setIsLoading(false);
    });

    socket.on('opponentDisconnected', () => {
      console.log('👋 Opponent disconnected');
      setError('Your opponent has disconnected.');
      setOpponentConnected(false);
      setSessionState('lobby');
    });

    socket.on('gameError', (message) => {
      setError(message || 'That battle action is not allowed.');
    });

    socket.on('roomClosed', () => {
      window.sessionStorage.removeItem('hostRoomId');
      setRoomId('');
      setOpponentConnected(false);
      setTopics([]);
      setQuizData([]);
      setCurrentQuestionIndex(0);
      setQuizAnswered(false);
      setSelectedAnswer('');
      setShowResult(false);
      setPlayer1QuizScore(0);
      setPlayer2QuizScore(0);
      setCurrentPlayer('Player 1');
      setIsMyTurn(true);
      rewardClaimedRef.current = false;
      setRewardMessage('');
      setRoomClosingMessage('');
      setSessionState('lobby');
      navigate('/OneOne');
    });

    return () => {
      socket.off('playerJoined');
      socket.off('joinedRoom');
      socket.off('roomReady');
      socket.off('opponentAction');
      socket.off('opponentQuizAnswer');
      socket.off('scoreUpdate');
      socket.off('joinError');
      socket.off('opponentDisconnected');
      socket.off('gameError');
      socket.off('roomClosed');
    };
  }, [isHost, navigate]);

  // --- TIMER COUNTDOWN ---
  useEffect(() => {
    if (sessionState === 'studying' && timeLeft > 0) {
      const interval = setInterval(() => {
        setTimeLeft(t => {
          if (t <= 1) {
            setSessionState('quizzing');
            setCurrentQuestionIndex(0);
            setCurrentPlayer('Player 1');
            setPlayer1QuizScore(0);
            setPlayer2QuizScore(0);
            rewardClaimedRef.current = false;
            setRewardMessage('');
            setIsMyTurn(isHost);
            
            // Notify opponent that quiz started
            socket.emit('gameAction', {
              roomId,
              action: 'quizStarted',
              payload: {}
            });
            
            return 0;
          }
          return t - 1;
        });
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [sessionState, timeLeft, roomId, isHost]);

  // --- ACTION HANDLERS ---
  const handleCreateRoom = useCallback(() => {
    if (connectionStatus !== 'connected') {
      setError('Please wait for connection to establish');
      return;
    }
    
    setIsLoading(true);
    setError('');
    
    socket.emit('createRoom', (newRoomId) => {
      console.log('🏠 Room created:', newRoomId);
      setIsHost(true);
      setRoomId(newRoomId);
      setSessionState('waiting');
      setIsLoading(false);
      
      // Update URL without full navigation
      const newUrl = `/battle/${newRoomId}`;
      window.history.pushState({ isHost: true }, '', newUrl);
      
      // Store room ID in session storage for host
      window.sessionStorage.setItem('hostRoomId', newRoomId);
    });
  }, [connectionStatus]);

  // Handle joining a room (merged: was previously declared twice)
  const handleJoinRoom = useCallback(() => {
    if (!joinRoomId.trim()) {
      setError('Please enter a Room ID');
      return;
    }
    
    if (connectionStatus !== 'connected') {
      setError('Please wait for connection to establish');
      return;
    }
    
    setIsLoading(true);
    setError('');
    
    const normalizedRoomId = joinRoomId.trim().toUpperCase();
    setIsHost(false);
    socket.emit('joinRoom', { roomId: normalizedRoomId, playerName: 'Player 2' });
    window.sessionStorage.removeItem('hostRoomId');
    
    // Clear input after attempting to join
    setJoinRoomId('');
  }, [joinRoomId, connectionStatus]);

  const handleFileUpload = useCallback(async (event) => {
    if (!isHost) {
      setError('Only the room host can upload study material.');
      return;
    }

    const file = event.target.files[0];
    if (!file) return;

    // Validate file
    if (file.type !== 'application/pdf') {
      setError('Please upload a PDF file.');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError('File too large. Please upload a file smaller than 10MB.');
      return;
    }

    setIsLoading(true);
    setError('');

    const formData = new FormData();
    formData.append('pdfFile', file);

    try {
      console.log('📤 Uploading PDF for analysis...');
      const response = await fetch('http://localhost:3000/api/analyze-pdf', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Server error: ${response.status}`);
      }

      const data = await response.json();

      if (!data.success || !data.topics || !data.quiz) {
        throw new Error('Invalid response format from server');
      }

      console.log('✅ PDF analysis successful:', data);
      setTopics(data.topics);
      setQuizData(data.quiz);

      // Broadcast to opponent
      socket.emit('gameAction', {
        roomId,
        action: 'pdfAnalyzed',
        payload: {
          topics: data.topics,
          quiz: data.quiz,
          studyDuration
        }
      });

    } catch (err) {
      console.error('❌ PDF upload error:', err);
      setError(err.message || 'Failed to analyze PDF. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [isHost, roomId, studyDuration]);

  const startSession = useCallback(() => {
    if (!isHost) {
      setError('Only the room host can start the battle.');
      return;
    }

    const initialTime = studyDuration * 60;
    setTimeLeft(initialTime);
    setSessionState('studying');
    
    socket.emit('gameAction', {
      roomId,
      action: 'startSession',
      payload: { studyTime: initialTime }
    });
  }, [isHost, roomId, studyDuration]);


  const endQuiz = useCallback((finalP1Score = player1QuizScore, finalP2Score = player2QuizScore) => {
    setSessionState('results');
    
    // Notify opponent about quiz end
    socket.emit('gameAction', {
      roomId,
      action: 'quizEnded',
      payload: {
        player1Score: finalP1Score,
        player2Score: finalP2Score
      }
    });
  }, [player1QuizScore, player2QuizScore, roomId]);

  const handleAnswer = useCallback((selectedOption) => {
    if (quizAnswered || !isMyTurn) return;
    
    setSelectedAnswer(selectedOption);
    setQuizAnswered(true);
    setShowResult(true);
    
    const isCorrect = selectedOption === quizData[currentQuestionIndex].answer;
    const currentPlayerName = isHost ? 'Player 1' : 'Player 2';
    const nextPlayer1Score = player1QuizScore + (isCorrect && isHost ? 1 : 0);
    const nextPlayer2Score = player2QuizScore + (isCorrect && !isHost ? 1 : 0);
    
    // Update local score
    setPlayer1QuizScore(nextPlayer1Score);
    setPlayer2QuizScore(nextPlayer2Score);
    
    // Send answer to opponent
    socket.emit('quizAnswer', {
      roomId,
      questionIndex: currentQuestionIndex,
      chosenOption: selectedOption,
      answer: selectedOption,
      isCorrect,
      player: currentPlayerName
    });
    
    setTimeout(() => {
      if (currentQuestionIndex < quizData.length - 1) {
        const nextIndex = currentQuestionIndex + 1;
        const nextPlayer = currentPlayer === 'Player 1' ? 'Player 2' : 'Player 1';
        const nextIsMyTurn = !isMyTurn;
        
        setCurrentQuestionIndex(nextIndex);
        setCurrentPlayer(nextPlayer);
        setIsMyTurn(nextIsMyTurn);
        setQuizAnswered(false);
        setSelectedAnswer('');
        setShowResult(false);
        
        // Notify opponent about next question
        socket.emit('gameAction', {
          roomId,
          action: 'nextQuestion',
          payload: {
            questionIndex: nextIndex,
            currentPlayer: nextPlayer,
            isMyTurn: !nextIsMyTurn // Opposite for opponent
          }
        });
      } else {
        endQuiz(nextPlayer1Score, nextPlayer2Score);
      }
    }, 2000);
  }, [quizAnswered, isMyTurn, quizData, currentQuestionIndex, isHost, player1QuizScore, player2QuizScore, currentPlayer, roomId, endQuiz]);


  const resetGame = useCallback(() => {
    // Reset all states
    setIsHost(true);
    setSessionState('lobby');
    setOpponentConnected(false);
    setTopics([]);
    setQuizData([]);
    setCurrentQuestionIndex(0);
    setQuizAnswered(false);
    setSelectedAnswer('');
    setShowResult(false);
    setPlayer1QuizScore(0);
    setPlayer2QuizScore(0);
    setCurrentPlayer('Player 1');
    setIsMyTurn(true);
    rewardClaimedRef.current = false;
    setRewardMessage('');
    setRoomClosingMessage('');
    setError('');
    setTimeLeft(studyDuration * 60);
    
    window.sessionStorage.removeItem('hostRoomId');
    navigate('/OneOne');
  }, [navigate, studyDuration]);

  const closeRoomAndReturn = useCallback(() => {
    const closingRoomId = roomId;
    window.sessionStorage.removeItem('hostRoomId');

    if (closingRoomId) {
      socket.emit('gameAction', {
        roomId: closingRoomId,
        action: 'deleteRoom',
        payload: {}
      });
    }

    setRoomId('');
    setOpponentConnected(false);
    setTopics([]);
    setQuizData([]);
    setCurrentQuestionIndex(0);
    setQuizAnswered(false);
    setSelectedAnswer('');
    setShowResult(false);
    setPlayer1QuizScore(0);
    setPlayer2QuizScore(0);
    setCurrentPlayer('Player 1');
    setIsMyTurn(true);
    rewardClaimedRef.current = false;
    setRewardMessage('');
    setRoomClosingMessage('');
    setSessionState('lobby');
    navigate('/OneOne');
  }, [navigate, roomId]);

  useEffect(() => {
    if (sessionState !== 'results' || rewardClaimedRef.current) return;

    const myScore = isHost ? player1QuizScore : player2QuizScore;
    const opponentScore = isHost ? player2QuizScore : player1QuizScore;
    const wonMatch = myScore > opponentScore;

    if (!wonMatch || !roomId) return;

    const token = localStorage.getItem('token');
    if (!token) {
      setRewardMessage('Log in before battles to claim winner XP.');
      return;
    }

    rewardClaimedRef.current = true;

    const claimReward = async () => {
      try {
        const response = await fetch('http://localhost:3000/api/battle/reward', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            roomId,
            won: true,
            score: myScore,
            opponentScore,
          }),
        });
        const data = await response.json();

        if (!response.ok) {
          setRewardMessage(data.error || 'Winner XP could not be added.');
          return;
        }

        setRewardMessage(`+${data.reward} XP added. Wallet: ${data.wallet} XP`);
      } catch {
        setRewardMessage('Winner XP could not be added.');
      }
    };

    claimReward();
  }, [sessionState, isHost, player1QuizScore, player2QuizScore, roomId]);

  useEffect(() => {
    if (sessionState !== 'results') return undefined;

    setRoomClosingMessage('Room will close and return to the 1v1 lobby shortly.');
    const timeoutId = window.setTimeout(() => {
      closeRoomAndReturn();
    }, 8000);

    return () => window.clearTimeout(timeoutId);
  }, [closeRoomAndReturn, sessionState]);

  const copyInviteLink = useCallback(() => {
    if (roomId) {
      navigator.clipboard.writeText(roomId).then(() => {
        // Could show a toast notification here
        console.log('📋 Room ID copied to clipboard');
      });
    }
  }, [roomId]);

  // --- UTILITY FUNCTIONS ---
  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const getConnectionStatusIcon = () => {
    switch (connectionStatus) {
      case 'connected': return <CheckCircle className="text-green-500" size={16} />;
      case 'connecting': return <Timer className="text-yellow-500" size={16} />;
      case 'disconnected': return <AlertCircle className="text-red-500" size={16} />;
      default: return <AlertCircle className="text-red-500" size={16} />;
    }
  };

  // --- RENDER FUNCTIONS ---
  const renderLobby = () => (
    <div className="input-section arena-panel">
      <div className="section-kicker"><Swords size={16} /> Live 1v1 study battle</div>
      <h2>Battle Arena</h2>
      <p className="section-subtitle">Create a private room, upload a PDF, study together, then answer turn-by-turn quiz questions.</p>
      
      {connectionStatus !== 'connected' ? (
        <div className="connection-status">
          {getConnectionStatusIcon()}
          <span>Connecting to server...</span>
        </div>
      ) : (
        <div className="room-options">
          <div className="option-panel">
            <div className="option-icon"><Users size={24} /></div>
            <h3>Create Battle Room</h3>
            <p>Create a new room and share the Room ID with your opponent</p>
            <button 
              className="btn-primary" 
              onClick={handleCreateRoom}
              disabled={isLoading}
            >
              <Users /> {isLoading ? 'Creating...' : 'Create Room'}
            </button>
          </div>
          
          <div className="option-panel">
            <div className="option-icon"><Swords size={24} /></div>
            <h3>Join Battle Room</h3>
            <p>Enter the Room ID provided by your opponent</p>
            <div className="join-room-input">
              <input
                type="text"
                placeholder="Enter Room ID"
                value={joinRoomId}
                onChange={(e) => setJoinRoomId(e.target.value.toUpperCase())}
                maxLength="6"
                onKeyDown={(e) => e.key === 'Enter' && handleJoinRoom()}
              />
              <button 
                className="btn-primary" 
                onClick={handleJoinRoom}
                disabled={isLoading || !joinRoomId.trim()}
              >
                {isLoading ? 'Joining...' : 'Join Room'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const renderWaiting = () => (
    <div className="waiting-section arena-panel">
      <div className="section-kicker"><Users size={16} /> Room created</div>
      <h2>Waiting for Opponent</h2>
      <div className="loader"></div>
      
      {roomId && (
        <div className="room-info-section">
          <p>Share this Room ID with your opponent:</p>
          <div className="room-id-display">
            <span className="room-id-value">{roomId}</span>
            <button 
              className="btn-secondary" 
              onClick={copyInviteLink}
              title="Copy Room ID"
            >
              <Copy size={18} />
            </button>
          </div>
          <p className="room-id-label">Room ID: <strong>{roomId}</strong></p>
        </div>
      )}
    </div>
  );

  const renderIdle = () => (
    <div className="input-section arena-panel arena-panel-wide">
      <div className="battle-header">
        <div>
          <div className="section-kicker"><FileText size={16} /> Match setup</div>
          <h2>Battle Setup</h2>
        </div>
        <div className="connection-info">
          <span className={`status ${opponentConnected ? 'connected' : 'waiting'}`}>
            {opponentConnected ? 'Opponent Ready' : 'Waiting for opponent'}
          </span>
        </div>
      </div>
    
      {isHost ? (
        <div className="host-controls">
          <div className="settings-container">
            <label htmlFor="study-duration"><Timer size={16} /> Study Time (minutes)</label>
            <input
              id="study-duration"
              type="number"
              value={studyDuration}
              onChange={e => setStudyDuration(Math.max(1, Math.min(60, Number(e.target.value))))}
              min="1"
              max="60"
              disabled={topics.length > 0}
            />
          </div>
        
          <div className="upload-section">
            <label htmlFor="pdf-upload" className="upload-label">
              <Upload /> Upload Study Material (PDF)
            </label>
            <input
              id="pdf-upload"
              type="file"
              accept=".pdf"
              onChange={handleFileUpload}
              disabled={isLoading || topics.length > 0}
            />
          </div>
        
          {isLoading && (
            <div className="loading-status">
              <div className="loader"></div>
              <p>AI is analyzing your PDF...</p>
            </div>
          )}
        
          {topics.length > 0 && quizData.length > 0 && opponentConnected && (
            <button className="btn-primary btn-start" onClick={startSession}>
              <Rocket size={18} /> Start Battle Session
            </button>
          )}
        </div>
      ) : (
        <div className="guest-waiting">
          <p>Waiting for host to upload study material...</p>
          {topics.length > 0 && <p>Study material received. Ready to start.</p>}
        </div>
      )}
    
      {topics.length > 0 && (
        <div className="topics-preview">
          <h3><BookOpen size={18} /> Study Topics</h3>
          <ul className="topics-list">
            {topics.map((topic, index) => (
              <li key={index}>{topic}</li>
            ))}
          </ul>
        </div>
      )}
    
      {roomId && (
        <div className="room-display">
          <p>Your Room ID: <strong>{roomId}</strong></p>
          <button 
            className="btn-secondary" 
            onClick={copyInviteLink}
            title="Copy Room ID"
          >
            <Copy size={16} /> Copy ID
          </button>
        </div>
      )}
    </div>
  );

  const renderStudying = () => (
    <div className="studying-section arena-panel">
      <div className="section-kicker"><BookOpen size={16} /> Focus round</div>
      <h2>Study Time</h2>
      <div className="timer-display" style={{
        background: timerTheme.background,
        color: timerTheme.timerColor,
        borderColor: timerTheme.accentColor
      }}>
        <Timer size={32} color={timerTheme.timerColor} />
        <span className="timer-text" style={{ color: timerTheme.timerColor }}>{formatTime(timeLeft)}</span>
      </div>
      <p>Focus and study the material. Quiz starts when timer ends!</p>
      
      {topics.length > 0 && (
        <div className="study-topics">
          <h3>Key Topics to Focus On:</h3>
          <ul>
            {topics.map((topic, index) => (
              <li key={index}>{topic}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );

  const renderQuizzing = () => {
    const currentQuestion = quizData[currentQuestionIndex];
    if (!currentQuestion) return <div className="loader"></div>;

    return (
      <div className="quiz-section arena-panel arena-panel-wide">
        <div className="quiz-header">
          <div>
            <div className="section-kicker"><Brain size={16} /> Quiz round</div>
            <h2>Quiz Battle</h2>
          </div>
          <div className="turn-indicator">
            <span className={`player-turn ${isMyTurn ? 'active' : ''}`}>
              {isMyTurn ? 'Your Turn' : `${opponentName}'s Turn`}
            </span>
          </div>
        </div>

        <div className="quiz-progress">
          <span>Question {currentQuestionIndex + 1} of {quizData.length}</span>
          <div className="score-display">
            <span>You: {isHost ? player1QuizScore : player2QuizScore}</span>
            <span>{opponentName}: {isHost ? player2QuizScore : player1QuizScore}</span>
          </div>
        </div>

        <div className="quiz-card">
          <h3 className="question">{currentQuestion.question}</h3>
          
          <div className="options-grid">
            {currentQuestion.options.map((option, index) => {
              let buttonClass = 'option-btn';
              
              if (showResult && selectedAnswer) {
                if (option === currentQuestion.answer) {
                  buttonClass += ' correct';
                } else if (option === selectedAnswer) {
                  buttonClass += ' incorrect';
                }
              }

              return (
                <button
                  key={index}
                  className={buttonClass}
                  onClick={() => handleAnswer(option)}
                  disabled={quizAnswered || !isMyTurn}
                >
                  {option}
                </button>
              );
            })}
          </div>

          {showResult && (
            <div className="answer-feedback">
              {selectedAnswer === currentQuestion.answer ? (
                <p className="correct-feedback">Correct!</p>
              ) : (
                <p className="incorrect-feedback">Incorrect. The answer was: {currentQuestion.answer}</p>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderResults = () => {
    const myScore = isHost ? player1QuizScore : player2QuizScore;
    const opponentScore = isHost ? player2QuizScore : player1QuizScore;
    const isWinner = myScore > opponentScore;
    const isTie = myScore === opponentScore;

    return (
      <div className="results-section arena-panel">
        <div className="results-header">
          <Trophy size={48} className="trophy-icon" />
          <h2>Battle Complete</h2>
        </div>

        <div className="results-content">
          {isTie ? (
            <div className="tie-result">
              <h3>It's a Tie</h3>
              <p>Great minds think alike!</p>
            </div>
          ) : (
            <div className={`winner-announcement ${isWinner ? 'winner' : 'loser'}`}>
              <h3>{isWinner ? 'You Won' : `${opponentName} Wins`}</h3>
              <p>{isWinner ? 'Excellent work!' : 'Better luck next time!'}</p>
            </div>
          )}

          <div className="final-scores">
            <div className="score-card">
              <h4>Your Score</h4>
              <div className="score-value">{myScore}</div>
              <div className="score-percentage">
                {Math.round((myScore / quizData.length) * 100)}%
              </div>
            </div>
            
            <div className="score-card">
              <h4>{opponentName}'s Score</h4>
              <div className="score-value">{opponentScore}</div>
              <div className="score-percentage">
                {Math.round((opponentScore / quizData.length) * 100)}%
              </div>
            </div>
          </div>

          {rewardMessage && (
            <div className="reward-message">
              <Sparkles size={18} /> {rewardMessage}
            </div>
          )}

          {roomClosingMessage && (
            <div className="room-closing-message">
              <Timer size={18} /> {roomClosingMessage}
            </div>
          )}

          <div className="results-actions">
            <button className="btn-primary" onClick={closeRoomAndReturn}>
              <Rocket size={18} /> Back to 1v1 Lobby
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderContent = () => {
    switch (sessionState) {
      case 'lobby': return renderLobby();
      case 'waiting': return renderWaiting();
      case 'idle': return renderIdle();
      case 'studying': return renderStudying();
      case 'quizzing': return renderQuizzing();
      case 'results': return renderResults();
      default: return <div className="loader"></div>;
    }
  };

  // --- MAIN RENDER ---
  return (
    <div className="battle-page" style={{
      background: timerTheme.background,
      color: timerTheme.timerColor
    }}>
      <header className="header" style={{
        background: `rgba(5, 7, 18, 0.78)`,
        borderBottom: `1px solid rgba(103, 232, 249, 0.22)`
      }}>
        <div className="header-container">
          <div className="logo-container">
            <Sparkles className="logo-icon" style={{ color: timerTheme.accentColor }} />
            <h1>1v1 Arena</h1>
          </div>
          
          <div className="header-info">
            <button
              className="btn-secondary header-dashboard-btn"
              type="button"
              onClick={() => navigate('/dashboard')}
            >
              <Home size={16} /> Dashboard
            </button>

            {roomId && (
              <div className="room-info">
                <span>Room: {roomId}</span>
              </div>
            )}
            
            <div className="connection-status">
              {getConnectionStatusIcon()}
              <span className="status-text">{connectionStatus}</span>
            </div>
          </div>
        </div>
      </header>

      <main className="main-content">
        {error ? (
          <div className="error-section">
            <div className="error-content">
              <AlertCircle size={32} className="error-icon" />
              <p className="error-message">{error}</p>
              <button className="btn-primary" onClick={resetGame}>
                <Home size={18} /> Go Home
              </button>
            </div>
          </div>
        ) : (
          renderContent()
        )}
      </main>

      <footer className="footer">
        <p>Challenge your friends | Learn together | Compete fairly</p>
      </footer>
    </div>
  );
}
