const express = require('express');
const router = express.Router();
const {
    getSales,
    createSale
} = require('../controllers/saleController');

router.route('/')
    .get(getSales)
    .post(createSale);

module.exports = router;

