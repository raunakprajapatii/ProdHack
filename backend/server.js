// Conversation with Gemini


 // 1. IMPORTS & SETUP 
 require('dotenv').config(); 
 const express = require('express'); 
 const http = require('http'); 
 const { Server } = require('socket.io'); 
 const cors = require('cors'); 
 const multer = require('multer'); 
 const mongoose = require('mongoose'); 
 const jwt = require('jsonwebtoken'); 
 const bcrypt = require('bcryptjs'); 
 const { body, validationResult } = require('express-validator'); 
 const { GoogleGenerativeAI } = require('@google/generative-ai'); 


 // Initialize app & server 
 const app = express(); 
 const server = http.createServer(app); 

 // 2. DATABASE CONNECTION 
 const connectDB = async () => { 
   try { 
     await mongoose.connect(process.env.MONGODB_URI, { 
       useNewUrlParser: true, 
       useUnifiedTopology: true, 
     }); 
     console.log('âœ… MongoDB connected'); 
   } catch (err) { 
     console.error('âŒ MongoDB connection error:', err.message); 
     process.exit(1); 
   } 
 }; 
 connectDB(); 

 // User Schema (inline for simplicity) 
 const UserSchema = new mongoose.Schema({ 
   username: { type: String, required: true, unique: true, trim: true, minlength: 3 }, 
   email: { type: String, required: true, unique: true, trim: true, lowercase: true }, 
   password: { type: String, required: true, minlength: 6 }, 
   profile: { 
     displayName: { type: String, default: function() { return this.username; } }, 
     profilePic: { type: String, default: '' },
     dob: { type: Date, default: null },
     educationCentre: { type: String, default: '' },
     gamesPlayed: { type: Number, default: 0 }, 
     gamesWon: { type: Number, default: 0 }, 
     totalScore: { type: Number, default: 0 } 
   },
   wallet: { type: Number, default: 1000 },
   store: {
     ownedItems: { type: [String], default: ['classic-clock'] },
     equippedItems: {
       Theme: { type: String, default: '' },
       Playlist: { type: String, default: '' },
       Booster: { type: String, default: '' },
       Clock: { type: String, default: 'classic-clock' }
     },
     playlistLimit: { type: Number, default: 0 },
     playlistSongs: { type: [String], default: [] }
   } 
 }, { timestamps: true }); 

 // Hash password before saving 
 UserSchema.pre('save', async function(next) { 
   if (!this.isModified('password')) return next(); 
   try { 
     const salt = await bcrypt.genSalt(10); 
     this.password = await bcrypt.hash(this.password, salt); 
     next(); 
   } catch (error) { 
     next(error); 
   } 
 }); 

 // Compare password method 
 UserSchema.methods.comparePassword = async function(candidatePassword) { 
   return bcrypt.compare(candidatePassword, this.password); 
 }; 

 const User = mongoose.model('User', UserSchema); 

 // 3. MIDDLEWARE 
 app.use(cors({ 
   origin: ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:3000', 'http://127.0.0.1:5173', 'http://127.0.0.1:5174'], 
   credentials: true 
 })); 
 app.use(express.json({ limit: '2mb' })); 

 // 4. SOCKET.IO SETUP 
 const io = new Server(server, { 
   cors: { 
     origin: ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:3000', 'http://127.0.0.1:5173', 'http://127.0.0.1:5174'], 
     methods: ['GET', 'POST'], 
     credentials: true 
   } 
 }); 

 // JWT Secret 
 const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key'; 

 // Auth middleware 
 const authenticateToken = (req, res, next) => { 
   const authHeader = req.headers['authorization']; 
   const token = authHeader && authHeader.split(' ')[1]; 
   if (!token) return res.status(401).json({ success: false, error: 'Access token required' }); 
    
   jwt.verify(token, JWT_SECRET, (err, user) => { 
     if (err) return res.status(403).json({ success: false, error: 'Invalid token' }); 
     req.user = user; 
     next(); 
   }); 
 }; 

 // 5. AUTHENTICATION ROUTES 
 const authRouter = express.Router(); 

 // Register 
 authRouter.post(['/register', '/signup'], [ 
   body('username').optional().isLength({ min: 3, max: 20 }).trim().escape(), 
   body('email').isEmail().normalizeEmail(), 
   body('password').isLength({ min: 6 }) 
 ], async (req, res) => { 
   try { 
     const errors = validationResult(req); 
     if (!errors.isEmpty()) { 
       return res.status(400).json({ 
         success: false, 
         error: 'Validation failed', 
         details: errors.array() 
       }); 
     } 

     const { name, email, password, displayName } = req.body;
     const username = req.body.username || name || (email ? email.split('@')[0] : 'player'); 
     const existingUser = await User.findOne({ $or: [{ email }, { username }] }); 
      
     if (existingUser) { 
       return res.status(400).json({ 
         success: false, 
         error: existingUser.email === email ? 'Email already registered' : 'Username already taken' 
       }); 
     } 

     const user = new User({ 
       username, 
       email, 
       password, 
       profile: { displayName: displayName || username } 
     }); 

     await user.save(); 

     const token = jwt.sign( 
       { userId: user._id, username: user.username, email: user.email }, 
       JWT_SECRET, 
       { expiresIn: '7d' } 
     ); 

     res.status(201).json({ 
       success: true, 
       message: 'User registered successfully', 
       token, 
       user: { 
         id: user._id, 
         username: user.username, 
         email: user.email, 
         profile: user.profile, 
         createdAt: user.createdAt 
       } 
     }); 
   } catch (error) { 
     console.error('Registration error:', error); 
     res.status(500).json({ success: false, error: 'Registration failed. Please try again.' }); 
   } 
 }); 

 // Login 
 authRouter.post('/login', [ 
   body('password').notEmpty() 
 ], async (req, res) => { 
   try { 
     const errors = validationResult(req); 
     if (!errors.isEmpty()) { 
       return res.status(400).json({ success: false, error: 'Please provide valid login credentials' }); 
     } 

     const { password } = req.body;
     const login = req.body.login || req.body.email;
     if (!login) {
       return res.status(400).json({ success: false, error: 'Please provide valid login credentials' });
     }

     const user = await User.findOne({
       $or: [{ email: login.toLowerCase() }, { username: login }]
     }); 

     if (!user) { 
       return res.status(400).json({ success: false, error: 'Invalid login credentials' }); 
     } 

     const isValidPassword = await user.comparePassword(password); 
     if (!isValidPassword) { 
       return res.status(400).json({ success: false, error: 'Invalid login credentials' }); 
     } 

     const token = jwt.sign( 
       { userId: user._id, username: user.username, email: user.email }, 
       JWT_SECRET, 
       { expiresIn: '7d' } 
     ); 

     res.json({ 
       success: true, 
       message: 'Login successful', 
       token, 
       user: { 
         id: user._id, 
         username: user.username, 
         email: user.email, 
         profile: user.profile, 
         createdAt: user.createdAt 
       } 
     }); 
   } catch (error) { 
     console.error('Login error:', error); 
     res.status(500).json({ success: false, error: 'Login failed. Please try again.' }); 
   } 
 }); 

 // Get Profile 
 authRouter.get('/profile', authenticateToken, async (req, res) => { 
   try { 
     const user = await User.findById(req.user.userId).select('-password'); 
     if (!user) { 
       return res.status(404).json({ success: false, error: 'User not found' }); 
     } 

     res.json({ 
       success: true, 
       user: { 
         id: user._id, 
         username: user.username, 
         email: user.email, 
         profile: user.profile, 
         createdAt: user.createdAt 
       } 
     }); 
   } catch {
     res.status(500).json({ success: false, error: 'Failed to fetch profile' }); 
   } 
 }); 

 // Update Profile 
 authRouter.put('/profile', authenticateToken, async (req, res) => { 
   try { 
     const { displayName, email, profilePic, dob, educationCentre } = req.body; 
     const user = await User.findById(req.user.userId); 
      
     if (!user) { 
       return res.status(404).json({ success: false, error: 'User not found' }); 
     } 

     if (displayName !== undefined) user.profile.displayName = displayName; 
     if (profilePic !== undefined) user.profile.profilePic = profilePic;
     if (dob !== undefined) user.profile.dob = dob || null;
     if (educationCentre !== undefined) user.profile.educationCentre = educationCentre;
     if (email && email !== user.email) {
       const existingUser = await User.findOne({ email: email.toLowerCase(), _id: { $ne: user._id } });
       if (existingUser) {
         return res.status(400).json({ success: false, error: 'Email already registered' });
       }
       user.email = email.toLowerCase();
     }
     await user.save(); 

     res.json({ 
       success: true, 
       message: 'Profile updated successfully', 
       user: { 
         id: user._id, 
         username: user.username, 
         email: user.email, 
         profile: user.profile, 
         createdAt: user.createdAt 
       } 
     }); 
   } catch {
     res.status(500).json({ success: false, error: 'Failed to update profile' }); 
   } 
 }); 

 app.use('/api/auth', authRouter); 

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
    id: 'cyber-punk', 
    name: 'Cyber Punk', 
    type: 'Theme', 
    price: 500, 
    badge: 'CPK', 
    description: 'Neon-drenched dystopian future aesthetic.',
    timerTheme: {
      background: 'linear-gradient(135deg, #ff00ff 0%, #00ffff 50%, #ff00ff 100%)',
      timerColor: '#00ff00',
      accentColor: '#ff00ff',
      secondaryColor: '#00ffff'
    },
    features: ['glitch-effects', 'neon-glow', 'cyberpunk-aesthetic']
  },
  { 
    id: 'sunset-blvd', 
    name: 'Sunset Boulevard', 
    type: 'Theme', 
    price: 400, 
    badge: 'SUN', 
    description: 'Warm gradient sunset with orange and pink hues.',
    timerTheme: {
      background: 'linear-gradient(135deg, #ff9a9e 0%, #fad0c4 50%, #fad0c4 100%)',
      timerColor: '#ffffff',
      accentColor: '#ff6b6b',
      secondaryColor: '#4ecdc4'
    },
    features: ['gradient-animation', 'warm-tones']
  },
  { 
    id: 'corporate-elite', 
    name: 'Corporate Elite', 
    type: 'Theme', 
    price: 350, 
    badge: 'CORP', 
    description: 'Sleek professional aesthetic for business professionals.',
    timerTheme: {
      background: 'linear-gradient(135deg, #2c3e50 0%, #4a5568 100%)',
      timerColor: '#ffffff',
      accentColor: '#3498db',
      secondaryColor: '#ecf0f1'
    },
    features: ['professional-look', 'clean-design']
  },
  { 
    id: 'pastel-dreams', 
    name: 'Pastel Dreams', 
    type: 'Theme', 
    price: 300, 
    badge: 'PST', 
    description: 'Soft pastel colors for a calming, dreamy atmosphere.',
    timerTheme: {
      background: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
      timerColor: '#2d3748',
      accentColor: '#f6ad55',
      secondaryColor: '#fbbf24'
    },
    features: ['soft-colors', 'gentle-gradients']
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

const getStorePayload = (user) => ({
  wallet: user.wallet || 0,
  ownedItems: user.store?.ownedItems || [],
  equippedItems: user.store?.equippedItems || { Theme: '', Playlist: '', Booster: '', Clock: 'classic-clock' },
  playlist: {
    limit: user.store?.playlistLimit || 0,
    songs: user.store?.playlistSongs || []
  }
});

app.get('/api/store/items', (req, res) => {
  res.json({ success: true, items: storeItems });
});

app.get('/api/store/me', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('-password');
    if (!user) return res.status(404).json({ success: false, error: 'User not found' });
    res.json({ success: true, ...getStorePayload(user) });
  } catch {
    res.status(500).json({ success: false, error: 'Failed to load store' });
  }
});

app.post('/api/store/purchase', authenticateToken, async (req, res) => {
  try {
    const { itemId } = req.body;
    const item = storeItems.find((storeItem) => storeItem.id === itemId);
    if (!item) return res.status(404).json({ success: false, error: 'Store item not found' });

    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ success: false, error: 'User not found' });

    user.store = user.store || {};
    user.store.ownedItems = user.store.ownedItems || [];

    if (user.store.ownedItems.includes(item.id)) {
      return res.status(400).json({ success: false, error: 'Item already owned' });
    }

    if ((user.wallet || 0) < item.price) {
      return res.status(400).json({ success: false, error: 'Not enough XP' });
    }

    user.wallet -= item.price;
    user.store.ownedItems.push(item.id);

    if (item.type === 'Playlist') {
      user.store.playlistLimit = (user.store.playlistLimit || 0) + (item.id === 'deep-work-pack' ? 10 : 5);
    }

    await user.save();
    res.json({ success: true, store: getStorePayload(user) });
  } catch {
    res.status(500).json({ success: false, error: 'Purchase failed' });
  }
});

app.post('/api/store/equip', authenticateToken, async (req, res) => {
  try {
    const { itemId } = req.body;
    const item = storeItems.find((storeItem) => storeItem.id === itemId);
    if (!item) return res.status(404).json({ success: false, error: 'Store item not found' });

    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ success: false, error: 'User not found' });
    if (!user.store?.ownedItems?.includes(item.id)) {
      return res.status(400).json({ success: false, error: 'Buy this item before equipping it' });
    }

    user.store.equippedItems = user.store.equippedItems || {};
    user.store.equippedItems[item.type] = item.id;
    await user.save();

    res.json({ success: true, store: getStorePayload(user) });
  } catch {
    res.status(500).json({ success: false, error: 'Equip failed' });
  }
});

app.post('/api/store/playlist', authenticateToken, async (req, res) => {
  try {
    const { songUrl } = req.body;
    if (!songUrl) return res.status(400).json({ success: false, error: 'Song URL is required' });

    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ success: false, error: 'User not found' });

    user.store.playlistSongs = user.store.playlistSongs || [];
    if (user.store.playlistSongs.length >= (user.store.playlistLimit || 0)) {
      return res.status(400).json({ success: false, error: 'Buy a playlist extender to add more songs' });
    }

    user.store.playlistSongs.push(songUrl);
    await user.save();

    res.json({ success: true, playlist: getStorePayload(user).playlist });
  } catch {
    res.status(500).json({ success: false, error: 'Could not update playlist' });
  }
});

app.get('/api/leaderboard', async (req, res) => {
  try {
    const users = await User.find({})
      .select('username email profile')
      .sort({ 'profile.gamesWon': -1, 'profile.totalScore': -1, 'profile.gamesPlayed': 1 })
      .limit(50);

    res.json({
      success: true,
      users: users.map((user) => ({
        id: user._id,
        username: user.username,
        displayName: user.profile?.displayName || user.username,
        profilePic: user.profile?.profilePic || '',
        gamesWon: user.profile?.gamesWon || 0,
        gamesPlayed: user.profile?.gamesPlayed || 0,
        totalScore: user.profile?.totalScore || 0
      }))
    });
  } catch {
    res.status(500).json({ success: false, error: 'Failed to load leaderboard' });
  }
});

 // 6. ROOM MANAGEMENT & SOCKET.IO 
 const rooms = new Map(); 
 const rewardedBattleRooms = new Set();

app.post('/api/battle/reward', authenticateToken, async (req, res) => {
  try {
    const { roomId, won, score = 0, opponentScore = 0 } = req.body;
    if (!roomId) return res.status(400).json({ success: false, error: 'Room ID is required' });
    if (!won) return res.status(400).json({ success: false, error: 'Only match winners earn battle XP' });

    const rewardKey = `${roomId}:${req.user.userId}`;
    if (rewardedBattleRooms.has(rewardKey)) {
      const existingUser = await User.findById(req.user.userId).select('wallet');
      return res.json({
        success: true,
        reward: 0,
        wallet: existingUser?.wallet || 0,
        message: 'Reward already claimed for this match'
      });
    }

    const room = rooms.get(roomId);
    if (room) {
      room.rewardedUsers = room.rewardedUsers || new Set();
      room.rewardedUsers.add(req.user.userId.toString());
    }

    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ success: false, error: 'User not found' });

    const reward = 50;
    rewardedBattleRooms.add(rewardKey);
    user.wallet = (user.wallet || 0) + reward;
    user.profile = user.profile || {};
    user.profile.gamesPlayed = (user.profile.gamesPlayed || 0) + 1;
    user.profile.gamesWon = (user.profile.gamesWon || 0) + 1;
    user.profile.totalScore = (user.profile.totalScore || 0) + Number(score || 0);
    await user.save();

    res.json({
      success: true,
      reward,
      wallet: user.wallet,
      score,
      opponentScore
    });
  } catch {
    res.status(500).json({ success: false, error: 'Could not add battle XP' });
  }
});

 io.on('connection', (socket) => { 
   console.log(`ðŸ”— Player connected: ${socket.id}`); 

   // Create Room 
   socket.on('createRoom', (callback) => { 
     const roomId = Math.random().toString(36).slice(2, 8).toUpperCase(); 
     rooms.set(roomId, { 
       players: new Set([socket.id]), 
       status: 'waiting', 
       host: socket.id, 
       created: new Date() 
     }); 
      
     socket.join(roomId); 
     socket.data.roomId = roomId; 
     socket.data.isHost = true; 
      
     console.log(`Room ${roomId} created by ${socket.id}`); 
     if (typeof callback === 'function') callback(roomId); 
   }); 

   // Join Room 
   socket.on('joinRoom', ({ roomId, playerName = 'Player 2' }) => { 
     const room = rooms.get(roomId); 
     if (!room) return socket.emit('joinError', 'Room not found.'); 
     if (room.players.size >= 2 && !room.players.has(socket.id)) { 
       return socket.emit('joinError', 'Room is full.'); 
     } 

     socket.join(roomId); 
     socket.data.roomId = roomId; 
     socket.data.isHost = false; 
     socket.data.playerName = playerName; 

     room.players.add(socket.id); 
     room.guest = socket.id;
     room.status = room.players.size >= 2 ? 'ready' : 'waiting'; 

     socket.emit('joinedRoom', { roomId, playerName }); 
     socket.to(roomId).emit('playerJoined', { playerName }); 

     if (room.players.size === 2) { 
       io.to(roomId).emit('roomReady'); 
     } 
   }); 

   // Game Actions 
   socket.on('gameAction', ({ roomId, action, payload }) => { 
     const room = rooms.get(roomId); 
     if (!room) return; 

     const hostOnlyActions = new Set(['pdfAnalyzed', 'startSession']);
     if (hostOnlyActions.has(action) && room.host !== socket.id) {
       socket.emit('gameError', 'Only the room host can do that.');
       return;
     }
      
     if (action === 'deleteRoom') {
       if (room.status !== 'results' && room.host !== socket.id) {
         socket.emit('gameError', 'Only the room host can close an active room.');
         return;
       }
       io.to(roomId).emit('roomClosed');
       rooms.delete(roomId);
       return;
     }

     if (action === 'pdfAnalyzed') { 
       room.topics = payload.topics; 
       room.quizData = payload.quiz; 
       room.studyDuration = payload.studyDuration; 
       room.pdfUploaded = true; 
     } else if (action === 'startSession') { 
       room.status = 'studying'; 
       room.sessionStarted = new Date(); 
     } else if (action === 'quizStarted') { 
       room.status = 'quizzing'; 
       room.scores = {}; 
       room.answers = {}; 
       for (const playerId of room.players) { 
         room.scores[playerId] = 0; 
         room.answers[playerId] = {}; 
       } 
     } else if (action === 'quizEnded') {
       room.status = 'results';
     } 
      
     socket.to(roomId).emit('opponentAction', { action, payload }); 
   }); 

   // Quiz Answer Handler 
   socket.on('quizAnswer', ({ roomId, questionIndex, chosenOption, answer }) => { 
     const room = rooms.get(roomId); 
      
     if (!room || room.status !== 'quizzing' || !room.quizData || !room.quizData[questionIndex]) { 
       console.log('Invalid quiz answer attempt.'); 
       return; 
     } 

     if (!room.answers) room.answers = {}; 
     if (!room.answers[socket.id]) room.answers[socket.id] = {}; 
      
     if (room.answers[socket.id][questionIndex] !== undefined) { 
       console.log(`Player ${socket.id} already answered question ${questionIndex}`); 
       socket.emit('answerAlreadySubmitted', { questionIndex }); 
       return; 
     } 

     const submittedOption = chosenOption || answer;
     room.answers[socket.id][questionIndex] = submittedOption; 
     const correctAnswer = room.quizData[questionIndex].answer; 
     const normalize = (str) => (str || '').toString().trim().toLowerCase(); 
     const isCorrect = normalize(submittedOption) === normalize(correctAnswer); 

     if (isCorrect) { 
       room.scores[socket.id] = (room.scores[socket.id] || 0) + 1; 
     } 

     socket.emit('answerProcessed', { 
       questionIndex, 
       chosenOption: submittedOption, 
       correctAnswer, 
       isCorrect, 
       newScore: room.scores[socket.id] 
     }); 

     socket.to(roomId).emit('opponentAnswered', { questionIndex }); 
     const playerScores = {
       player1Score: room.scores[room.host] || 0,
       player2Score: room.scores[room.guest] || 0
     };
     io.to(roomId).emit('scoreUpdate', playerScores); 
     console.log(`Updated scores for room ${roomId}:`, playerScores); 
   }); 

   // Disconnect handling 
   socket.on('disconnect', () => { 
     console.log(`ðŸ”Œ Player disconnected: ${socket.id}`); 
     const roomId = socket.data.roomId; 
     if (!roomId) return; 

     const room = rooms.get(roomId); 
     if (!room) return; 

     room.players.delete(socket.id); 

     if (room.players.size === 0) { 
       rooms.delete(roomId); 
       console.log(`ðŸ—‘ï¸ Room ${roomId} deleted (empty)`); 
     } else { 
       room.status = 'waiting'; 
       socket.to(roomId).emit('opponentDisconnected'); 
     } 
   }); 
 }); 

 // 7. PDF ANALYSIS ROUTE 
 const upload = multer({ 
   storage: multer.memoryStorage(), 
   limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit 
   fileFilter: (req, file, cb) => { 
     if (file.mimetype === 'application/pdf') cb(null, true); 
     else cb(new Error('Only PDF files are allowed'), false); 
   } 
 }); 

 const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY); 

 app.post('/api/analyze-pdf', upload.single('pdfFile'), async (req, res) => { 
   if (!req.file) return res.status(400).json({ success: false, error: 'No file uploaded.' }); 
   if (!process.env.GEMINI_API_KEY) return res.status(500).json({ success: false, error: 'Server configuration error: API key missing.' }); 

   const prompt = ` 
     Analyze the provided PDF for a study session. Suggest 10 key topics or concepts that a student should focus on to best understand the material. 
     Also, generate a 10-question multiple-choice quiz based on these core concepts. 
     Return a single, clean JSON object with the following structure: 
     { 
       "topics": ["<Suggested Topic 1>", ...], 
       "quiz": [ 
         { 
           "question": "<Question text>", 
           "options": ["<Option A>", "<Option B>", "<Option C>", "<Option D>"], 
           "answer": "<The correct option text>" 
         }, 
         ... 
       ] 
     } 
     Ensure the 'answer' value is present in its 'options' array. Do not include any text, explanations, or markdown formatting outside of this JSON object. The response must start with { and end with }. 
   `; 

   try { 
     const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" }); 
     const filePart = { 
       inlineData: { 
         data: req.file.buffer.toString("base64"), 
         mimeType: req.file.mimetype 
       } 
     }; 

     const result = await model.generateContent([prompt, filePart]); 
     const responseText = result.response.text(); 
      
     // === CORRECTED & IMPROVED PARSING LOGIC === 
     console.log("ðŸ¤– Raw Gemini Response:\n", responseText); // Essential for debugging 

     let data; 
     try { 
       // First, try to parse directly, in case the AI gives clean JSON 
       data = JSON.parse(responseText); 
     } catch { 
       console.warn('âš ï¸ Initial JSON parse failed. Attempting to extract from markdown code block.'); 
        
       // Use a robust regex to find and extract the JSON content 
       const jsonMatch = responseText.match(/```(?:json)?\s*([\s\S]+?)\s*```/); 

       if (jsonMatch && jsonMatch[1]) { 
         try { 
           // Parse the extracted content 
           data = JSON.parse(jsonMatch[1]); 
         } catch (innerParseError) { 
           console.error("âŒ Failed to parse the extracted JSON:", innerParseError); 
           throw new Error('Could not parse the JSON found inside the markdown block.'); 
         } 
       } else { 
         // If no markdown block is found, the response is truly malformed 
         console.error("âŒ Malformed AI Response (no valid JSON or markdown block found)"); 
         throw new Error('Invalid or malformed JSON response from AI.'); 
       } 
     } 

     if (!data.topics || !data.quiz || !Array.isArray(data.topics) || !Array.isArray(data.quiz)) { 
       throw new Error('AI response is missing required "topics" or "quiz" arrays.'); 
     } 

     res.json({ 
       success: true, 
       topics: data.topics.slice(0, 10), 
       quiz: data.quiz.slice(0, 10), 
       studyDuration: 15 
     }); 

   } catch (error) { 
     console.error('âŒ Gemini AI Error:', error.message); 
      
     // === IMPROVED ERROR HANDLING === 
     // Send a 500 error status and a clear error message to the client 
     res.status(500).json({ 
       success: false, 
       error: 'Failed to analyze PDF due to a server-side error.', 
       // Provide fallback data if the client is designed to handle it 
       fallbackData: { 
         topics: Array.from({ length: 10 }, (_, i) => `Analysis Failed: Topic ${i + 1}`), 
         quiz: Array.from({ length: 10 }, (_, i) => ({ 
           question: `This is fallback question #${i + 1}. The AI analysis failed.`, 
           options: ["Option A", "Option B", "Option C", "Option D"], 
           answer: "Option A" 
         })), 
         studyDuration: 15 
       } 
     }); 
   } 
 }); 

 // 8. DEBUG & HEALTH ROUTES 
 app.get('/api/health', (req, res) => { 
   res.json({ 
     status: 'OK', 
     timestamp: new Date().toISOString(), 
     activeRooms: rooms.size 
   }); 
 }); 

 app.get('/api/debug/rooms', (req, res) => { 
   const roomsData = Array.from(rooms.entries()).map(([roomId, data]) => ({ 
     roomId, 
     playerCount: data.players.size, 
     players: Array.from(data.players), 
     status: data.status, 
     scores: data.scores || {} 
   })); 
   res.json({ rooms: roomsData }); 
 }); 

 // 9. START SERVER 
 const PORT = process.env.PORT || 3000; 
 server.listen(PORT, () => { 
   console.log(`ðŸš€ Backend running on http://localhost:${PORT}`); 
   console.log(`ðŸ“¡ Socket.IO ready`); 
   console.log(`ðŸ¤– Gemini AI: ${process.env.GEMINI_API_KEY ? 'âœ… Configured' : 'âŒ Not configured'}`); 
 });









