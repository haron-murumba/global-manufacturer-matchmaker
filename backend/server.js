
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();

const allowedOrigins = [
  'http://localhost:3000',
  'https://global-manufacturer-matchmaker.vercel.app',
];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(null, false);
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);
app.use(express.json());

const projectRoutes = require('./routes/projectRoutes');
const manufacturerRoutes = require('./routes/manufacturerRoutes');
const adminRoutes = require('./routes/adminRoutes');
const rfqRoutes = require('./routes/rfqRoutes');
const notificationRoutes = require('./routes/notificationRoutes');

app.use('/api/projects', projectRoutes);
app.use('/api/manufacturers', manufacturerRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/rfqs', rfqRoutes);
app.use('/api/notifications', notificationRoutes);

app.get('/', (req, res) => {
  res.json({
    message: 'Global Manufacturer Matchmaker API is running',
  });
});

const PORT = process.env.PORT || 5000;

mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('MongoDB connected successfully');

    app.listen(PORT, () => {
      console.log(`GMM server running on port ${PORT}`);
    });
  })
  .catch((error) => {
    console.error('MongoDB connection failed:', error.message);
  });
