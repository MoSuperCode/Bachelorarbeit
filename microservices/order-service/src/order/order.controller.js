const { createOrder, getOrdersByUser } = require('./order.service');

// POST /orders
async function placeOrder(req, res, next) {
  try {
    const { userId } = req.body;
    if (!userId) {
      const err = new Error('userId ist erforderlich'); err.status = 400; return next(err);
    }
    const order = await createOrder(userId);
    res.status(201).json(order);
  } catch (err) { next(err); }
}

// GET /orders/:userId
async function getUserOrders(req, res, next) {
  try {
    res.json(await getOrdersByUser(req.params.userId));
  } catch (err) { next(err); }
}

module.exports = { placeOrder, getUserOrders };
