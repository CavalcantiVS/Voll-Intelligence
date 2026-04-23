const express = require('express');
const cors = require('cors');
require('dotenv').config();

const initDb = require('./db/initDb');
const aiRoutes = require('./routes/aiRoutes');
const historyRoutes = require('./routes/historyRoutes');
const chatRoutes = require('./routes/chatRoutes');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/ai', aiRoutes);
app.use('/api/history', historyRoutes);
app.use('/api/chat', chatRoutes);

app.get('/', (req, res) => {
  res.send('Voll AI Portal Backend Running');
});

initDb().then(() => {
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
});
