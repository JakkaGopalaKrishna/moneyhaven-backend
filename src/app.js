const express = require('express');
const cors = require('cors');

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes will be mounted here
app.get('/', (req, res) => res.send('MoneyHaven API is running'));

// Global error handler will be mounted here

module.exports = app;
