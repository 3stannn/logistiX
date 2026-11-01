const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
    name: { 
        type: String, 
        required: [true, 'Product name is required'], 
        trim: true 
    },
    description: { 
        type: String, 
        trim: true,
        default: '' 
    },
    quantity: { 
        type: Number, 
        required: [true, 'Quantity is required'], 
        min: [0, 'Quantity cannot be negative'],
        default: 0 
    },
    category: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Category', 
        required: [true, 'Category is required'] 
    },
    price: { 
        type: Number, 
        required: [true, 'Price is required'], 
        min: [0, 'Price cannot be negative'] 
    }
}, { timestamps: true });

module.exports = mongoose.model('Product', productSchema);

