const express = require('express');
const cors = require('cors');
const errorHandler = require('./middleware/errorHandler');

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes will be mounted here
app.get('/', (req, res) => res.send('MoneyHaven API is running'));

// Global error handler
app.use(errorHandler);

module.exports = app;
