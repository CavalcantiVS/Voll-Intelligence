const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
require('dotenv').config();

const initDb = require('./db/initDb');
const aiRoutes = require('./routes/aiRoutes');
const historyRoutes = require('./routes/historyRoutes');
const chatRoutes = require('./routes/chatRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const userRoutes = require('./routes/userRoutes');
const departmentRoutes = require('./routes/departmentRoutes');
const authRoutes = require('./routes/authRoutes');
const teamRoutes = require('./routes/teamRoutes');
const kanbanRoutes = require('./routes/kanbanRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const { startAutomationRunner } = require('./automationsRunner');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Rotas
app.use('/api/auth', authRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/history', historyRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/users', userRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/teams', teamRoutes);
app.use('/api/kanban', kanbanRoutes);
app.use('/api/notifications', notificationRoutes);

app.get('/', (req, res) => {
  res.send('Voll AI Portal Backend Running');
});

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

app.set('io', io);

// Inicia o robô de automações passando o io
startAutomationRunner(io);

// Rastreamento de presença: mapa de teamId -> array de objetos de usuários online
const onlineUsersByTeam = {};

io.on('connection', (socket) => {
  console.log(`[Socket] Connected: ${socket.id}`);

  socket.on('join_team', ({ teamId, user }) => {
    if (!teamId || !user) return;
    socket.join(teamId);
    
    // Armazena associação de conexão
    socket.teamId = teamId;
    socket.user = user;

    if (!onlineUsersByTeam[teamId]) {
      onlineUsersByTeam[teamId] = [];
    }

    // Adiciona se não estiver presente
    const exists = onlineUsersByTeam[teamId].some(u => u.id === user.id);
    if (!exists) {
      onlineUsersByTeam[teamId].push(user);
    }

    console.log(`[Socket] User ${user.name} joined team room: ${teamId}`);
    // Emite lista de membros online
    io.to(teamId).emit('team_online_members', onlineUsersByTeam[teamId]);
  });

  socket.on('leave_team', ({ teamId, userId }) => {
    if (!teamId) return;
    socket.leave(teamId);
    
    if (onlineUsersByTeam[teamId]) {
      onlineUsersByTeam[teamId] = onlineUsersByTeam[teamId].filter(u => u.id !== userId);
      io.to(teamId).emit('team_online_members', onlineUsersByTeam[teamId]);
    }
    console.log(`[Socket] User ${userId} left team room: ${teamId}`);
  });

  socket.on('disconnect', () => {
    console.log(`[Socket] Disconnected: ${socket.id}`);
    const teamId = socket.teamId;
    const user = socket.user;
    
    if (teamId && user && onlineUsersByTeam[teamId]) {
      // Remove usuário da lista online daquela equipe
      onlineUsersByTeam[teamId] = onlineUsersByTeam[teamId].filter(u => u.id !== user.id);
      io.to(teamId).emit('team_online_members', onlineUsersByTeam[teamId]);
    }
  });

  // Eventos Kanban Multi-board
  socket.on('join_kanban', (boardId) => {
    if (!boardId) return;
    socket.join(`kanban_${boardId}`);
    console.log(`[Socket] Joined kanban board: ${boardId}`);
  });

  socket.on('leave_kanban', (boardId) => {
    if (!boardId) return;
    socket.leave(`kanban_${boardId}`);
  });

  socket.on('kanban_update', ({ boardId, type, data }) => {
    // Broadcast para outros clientes na sala
    socket.to(`kanban_${boardId}`).emit('kanban_updated', { type, data });
  });
});

initDb().then(() => {
  server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
});

