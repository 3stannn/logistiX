const express = require('express');
const mongoose = require('mongoose');

const app = express();

app.use(express.json());

app.use(express.static('public'));

app.listen(3000, () => {
    console.log("Server running on http://localhost:3000")
})