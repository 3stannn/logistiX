const Category = require('../models/Category');
const Product = require('../models/Product');

// Get all categories with product count
exports.getCategories = async (req, res) => {
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
        counts.forEach((c) => {
            if (c._id) {
                countMap[c._id.toString()] = c.count;
            }
        });

        const result = categories.map((cat) => ({
            ...cat,
            itemCount: countMap[cat._id.toString()] || 0
        }));

        res.json(result);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch categories' });
    }
};

// Create a new category
exports.createCategory = async (req, res) => {
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
};

// Update a category by ID
exports.updateCategory = async (req, res) => {
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
};

// Delete a category by ID
exports.deleteCategory = async (req, res) => {
    try {
        const category = await Category.findByIdAndDelete(req.params.id);
        if (!category) return res.status(404).json({ error: 'Category not found' });
        res.json({ message: 'Category deleted', id: req.params.id });
    } catch (err) {
        res.status(500).json({ error: 'Failed to delete category' });
    }
};

