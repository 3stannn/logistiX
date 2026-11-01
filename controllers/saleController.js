const Sale = require('../models/Sale');
const Product = require('../models/Product');
const Activity = require('../models/Activity');

// Get all sales
exports.getSales = async (req, res) => {
    try {
        const sales = await Sale.find().populate('product', 'name').sort({ createdAt: -1 });
        res.json(sales);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch sales' });
    }
};

// Create a new sale
exports.createSale = async (req, res) => {
    try {
        const { productId, quantity, price, markup } = req.body;
        const qty = Number(quantity);
        if (!productId || !qty || qty <= 0) {
            return res.status(400).json({ error: 'Valid product and quantity are required' });
        }

        const product = await Product.findById(productId).populate('category', 'name');
        if (!product) {
            return res.status(404).json({ error: 'Product not found' });
        }

        if (product.quantity < qty) {
            return res.status(400).json({ 
                error: `Insufficient stock. Only ${product.quantity} available.` 
            });
        }

        const markupPct = (markup !== undefined && !isNaN(Number(markup))) ? Number(markup) : 5;
        const unitPrice = (price !== undefined && !isNaN(Number(price))) 
            ? Number(price) 
            : Math.round(product.price * (1 + markupPct / 100) * 100) / 100;
        const total = Math.round(qty * unitPrice * 100) / 100;
        const categoryName = product.category?.name || 'General';

        // Decrement product inventory
        product.quantity -= qty;
        await product.save();

        // Create Sale
        const sale = await Sale.create({
            product: product._id,
            productName: product.name,
            categoryName: categoryName,
            quantity: qty,
            basePrice: product.price,
            markup: markupPct,
            price: unitPrice,
            total: total
        });

        // Log "Out" activity
        await Activity.create({
            productName: product.name,
            description: product.description || 'Sale',
            quantity: qty,
            category: categoryName,
            price: unitPrice,
            type: 'Out'
        });

        res.status(201).json(sale);
    } catch (err) {
        res.status(500).json({ error: err.message || 'Failed to create sale' });
    }
};

