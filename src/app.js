const express = require('express');
const cors = require('cors');
const errorHandler = require('./middleware/errorHandler');

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const authRoutes = require('./routes/authRoutes');

// Routes will be mounted here
app.use('/api/auth', authRoutes);

// Global error handler
app.use(errorHandler);

module.exports = app;
