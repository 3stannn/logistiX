const Product = require('../models/Product');
const Sale = require('../models/Sale');
const Activity = require('../models/Activity');

// Get overview summary metrics and recent activity
exports.getOverview = async (req, res) => {
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
};

