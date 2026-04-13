const { Router } = require('express');
const { placeOrder, getUserOrders } = require('./order.controller');

const router = Router();

router.post('/',        placeOrder);    // POST /orders
router.get('/:userId',  getUserOrders); // GET  /orders/:userId

module.exports = router;
