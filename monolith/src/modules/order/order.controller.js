const { createOrder, getOrdersByUser } = require('./order.service');

// POST /api/orders
async function placeOrder(req, res, next) {
  try {
    const { userId } = req.body;
    if (!userId) {
      const err = new Error('userId ist erforderlich');
      err.status = 400;
      return next(err);
    }
    const order = await createOrder(userId);
    res.status(201).json(order);
  } catch (err) {
    next(err);
  }
}

// GET /api/orders/:userId
async function getUserOrders(req, res, next) {
  try {
    const orders = await getOrdersByUser(req.params.userId);
    res.json(orders);
  } catch (err) {
    next(err);
  }
}

module.exports = { placeOrder, getUserOrders };
