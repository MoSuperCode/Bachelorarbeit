const { Router } = require('express');
const { placeOrder, getUserOrders } = require('./order.controller');

const router = Router();

router.post('/',         placeOrder);    // POST /api/orders
router.get('/:userId',   getUserOrders); // GET  /api/orders/:userId

module.exports = router;
