const mongoose = require('mongoose');

const saleSchema = new mongoose.Schema({
    product: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Product', 
        required: true 
    },
    productName: { 
        type: String, 
        required: true 
    },
    categoryName: { 
        type: String,
        default: 'General'
    },
    quantity: { 
        type: Number, 
        required: [true, 'Quantity sold is required'], 
        min: [1, 'Must sell at least 1 item'] 
    },
    basePrice: {
        type: Number
    },
    markup: {
        type: Number,
        default: 5
    },
    price: { 
        type: Number, 
        required: true, 
        min: 0 
    },
    total: { 
        type: Number, 
        required: true, 
        min: 0 
    }
}, { timestamps: true });

module.exports = mongoose.model('Sale', saleSchema);

