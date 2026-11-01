const mongoose = require('mongoose');

const activitySchema = new mongoose.Schema({
    productName: { type: String, required: true },
    description: { type: String, default: '' },
    quantity: { type: Number, required: true },
    category: { type: String, default: 'General' },
    price: { type: Number, required: true },
    type: { type: String, enum: ['In', 'Out'], required: true },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Activity', activitySchema);

