const { Router } = require('express');
const { listProducts, getProduct } = require('./product.controller');

const router = Router();

router.get('/',    listProducts); // GET /api/products
router.get('/:id', getProduct);   // GET /api/products/:id

module.exports = router;
