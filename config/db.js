const mongoose = require('mongoose');
const Category = require('../models/Category');

async function seedDefaultCategories() {
    try {
        const count = await Category.countDocuments();
        if (count === 0) {
            await Category.create([
                { name: 'General', description: 'General items and supplies' },
                { name: 'Electronics', description: 'Gadgets, devices, and accessories' },
                { name: 'Apparel', description: 'Clothing, uniforms, and wear' },
                { name: 'Office', description: 'Stationery and office equipment' }
            ]);
            console.log('Default categories seeded.');
        }
    } catch (e) {
        console.error('Error seeding categories:', e.message);
    }
}

async function connectDB() {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/logistix';
    try {
        await mongoose.connect(mongoUri);
        console.log('Connected to MongoDB');
        await seedDefaultCategories();
    } catch (err) {
        console.error('Connection error', err);
    }
}

module.exports = connectDB;

