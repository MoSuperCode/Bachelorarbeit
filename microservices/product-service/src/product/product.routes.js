const { Router } = require('express');
const { listProducts, getProduct, stockCheck, stockDecrement } = require('./product.controller');

const router = Router();

router.get('/',              listProducts);    // GET  /products
router.get('/:id',           getProduct);      // GET  /products/:id
router.get('/:id/stock',     stockCheck);      // GET  /products/:id/stock?quantity=N
router.patch('/:id/stock',   stockDecrement);  // PATCH /products/:id/stock

module.exports = router;
