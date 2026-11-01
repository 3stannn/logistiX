const Product = require('../models/Product');
const Activity = require('../models/Activity');

// Get all products
exports.getProducts = async (req, res) => {
    try {
        const products = await Product.find().populate('category', 'name').sort({ createdAt: -1 });
        res.json(products);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch products' });
    }
};

// Get a single product by ID
exports.getProductById = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id).populate('category', 'name');
        if (!product) return res.status(404).json({ error: 'Product not found' });
        res.json(product);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch product' });
    }
};

// Create a new product
exports.createProduct = async (req, res) => {
    try {
        const { name, description, quantity, price, category } = req.body;
        if (!name || price === undefined || !category) {
            return res.status(400).json({ error: 'Name, price, and category are required' });
        }

        const product = await Product.create({
            name: name.trim(),
            description: description?.trim() || '',
            quantity: Number(quantity) || 0,
            price: Number(price),
            category
        });

        const populated = await Product.findById(product._id).populate('category', 'name');

        // Log initial stock as "In"
        await Activity.create({
            productName: populated.name,
            description: populated.description || 'Initial stock',
            quantity: populated.quantity,
            category: populated.category?.name || 'General',
            price: populated.price,
            type: 'In'
        });

        res.status(201).json(populated);
    } catch (err) {
        res.status(500).json({ error: err.message || 'Failed to create product' });
    }
};

// Update an existing product
exports.updateProduct = async (req, res) => {
    try {
        const { name, description, quantity, price, category } = req.body;
        const oldProduct = await Product.findById(req.params.id);
        if (!oldProduct) return res.status(404).json({ error: 'Product not found' });

        const newQty = Number(quantity);
        const updated = await Product.findByIdAndUpdate(
            req.params.id,
            {
                name: name?.trim(),
                description: description?.trim(),
                quantity: newQty,
                price: Number(price),
                category
            },
            { new: true, runValidators: true }
        ).populate('category', 'name');

        // If stock increased, log restock as "In"
        if (newQty > oldProduct.quantity) {
            await Activity.create({
                productName: updated.name,
                description: 'Restock / Adjustment',
                quantity: newQty - oldProduct.quantity,
                category: updated.category?.name || 'General',
                price: updated.price,
                type: 'In'
            });
        }

        res.json(updated);
    } catch (err) {
        res.status(500).json({ error: err.message || 'Failed to update product' });
    }
};

// Delete a product
exports.deleteProduct = async (req, res) => {
    try {
        const product = await Product.findByIdAndDelete(req.params.id);
        if (!product) return res.status(404).json({ error: 'Product not found' });
        res.json({ message: 'Product deleted', id: req.params.id });
    } catch (err) {
        res.status(500).json({ error: 'Failed to delete product' });
    }
};

