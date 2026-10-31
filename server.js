const express = require('express');
const mongoose = require('mongoose');

const app = express();

app.use(express.json());

mongoose.connect('mongodb://localhost:27017/logistix')
    .then(async () => {
        console.log('Connected to MongoDB');
        await seedDefaultCategories();
    })
    .catch((err) => console.log("Connection error", err));

// 1. Schemas
const categorySchema = new mongoose.Schema({
    name: { 
        type: String, 
        required: [true, 'Category name is required'], 
        unique: true, 
        trim: true 
    },
    description: { 
        type: String, 
        trim: true,
        default: '' 
    }
}, { timestamps: true });

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

const activitySchema = new mongoose.Schema({
    productName: { type: String, required: true },
    description: { type: String, default: '' },
    quantity: { type: Number, required: true },
    category: { type: String, default: 'General' },
    price: { type: Number, required: true },
    type: { type: String, enum: ['In', 'Out'], required: true },
    createdAt: { type: Date, default: Date.now }
});

const Category = mongoose.model('Category', categorySchema);
const Product = mongoose.model('Product', productSchema);
const Sale = mongoose.model('Sale', saleSchema);
const Activity = mongoose.model('Activity', activitySchema);

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

// 2. Category Routes
app.get('/api/categories', async (req, res) => {
    try {
        const categories = await Category.find().sort({ name: 1 }).lean();
        const counts = await Product.aggregate([
            {
                $group: {
                    _id: '$category',
                    count: { $sum: 1 }
                }
            }
        ]);

        const countMap = {};
        counts.forEach(c => {
            if (c._id) {
                countMap[c._id.toString()] = c.count;
            }
        });

        const result = categories.map(cat => ({
            ...cat,
            itemCount: countMap[cat._id.toString()] || 0
        }));

        res.json(result);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch categories' });
    }
});

app.post('/api/categories', async (req, res) => {
    try {
        const { name, description } = req.body;
        if (!name || !name.trim()) {
            return res.status(400).json({ error: 'Category name is required' });
        }
        const category = await Category.create({ 
            name: name.trim(), 
            description: description?.trim() || '' 
        });
        res.status(201).json(category);
    } catch (err) {
        if (err.code === 11000) {
            return res.status(400).json({ error: 'Category name already exists' });
        }
        res.status(500).json({ error: err.message || 'Failed to create category' });
    }
});

app.put('/api/categories/:id', async (req, res) => {
    try {
        const { name, description } = req.body;
        const category = await Category.findByIdAndUpdate(
            req.params.id,
            { name: name?.trim(), description: description?.trim() },
            { new: true, runValidators: true }
        );
        if (!category) return res.status(404).json({ error: 'Category not found' });
        res.json(category);
    } catch (err) {
        res.status(500).json({ error: err.message || 'Failed to update category' });
    }
});

app.delete('/api/categories/:id', async (req, res) => {
    try {
        const category = await Category.findByIdAndDelete(req.params.id);
        if (!category) return res.status(404).json({ error: 'Category not found' });
        res.json({ message: 'Category deleted', id: req.params.id });
    } catch (err) {
        res.status(500).json({ error: 'Failed to delete category' });
    }
});

// 3. Product Routes
app.get('/api/products', async (req, res) => {
    try {
        const products = await Product.find().populate('category', 'name').sort({ createdAt: -1 });
        res.json(products);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch products' });
    }
});

app.get('/api/products/:id', async (req, res) => {
    try {
        const product = await Product.findById(req.params.id).populate('category', 'name');
        if (!product) return res.status(404).json({ error: 'Product not found' });
        res.json(product);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch product' });
    }
});

app.post('/api/products', async (req, res) => {
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
});

app.put('/api/products/:id', async (req, res) => {
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
});

app.delete('/api/products/:id', async (req, res) => {
    try {
        const product = await Product.findByIdAndDelete(req.params.id);
        if (!product) return res.status(404).json({ error: 'Product not found' });
        res.json({ message: 'Product deleted', id: req.params.id });
    } catch (err) {
        res.status(500).json({ error: 'Failed to delete product' });
    }
});

// 4. Sale Routes
app.get('/api/sales', async (req, res) => {
    try {
        const sales = await Sale.find().populate('product', 'name').sort({ createdAt: -1 });
        res.json(sales);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch sales' });
    }
});

app.post('/api/sales', async (req, res) => {
    try {
        const { productId, quantity, price } = req.body;
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

        const unitPrice = price !== undefined ? Number(price) : product.price;
        const total = qty * unitPrice;
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
});

// 5. Overview Summary Route
app.get('/api/overview', async (req, res) => {
    try {
        const [products, sales, activities] = await Promise.all([
            Product.find(),
            Sale.find(),
            Activity.find().sort({ createdAt: -1 }).limit(10)
        ]);

        const totalRevenue = sales.reduce((acc, s) => acc + (s.total || 0), 0);
        const transactions = sales.length;
        const inventoryValue = products.reduce((acc, p) => acc + (p.price * p.quantity), 0);
        const totalInventory = products.reduce((acc, p) => acc + (p.quantity || 0), 0);

        res.json({
            totalRevenue,
            transactions,
            inventoryValue,
            totalInventory,
            recentActivity: activities
        });
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch overview summary' });
    }
});

app.use(express.static('public'));

app.listen(3000, () => {
    console.log("Server running on http://localhost:3000");
});
