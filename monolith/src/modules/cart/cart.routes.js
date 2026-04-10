const { Router } = require('express');
const { addItem, getCart } = require('./cart.controller');

const router = Router();

router.post('/:userId', addItem);  // POST /api/cart/:userId
router.get('/:userId',  getCart);  // GET  /api/cart/:userId

module.exports = router;
