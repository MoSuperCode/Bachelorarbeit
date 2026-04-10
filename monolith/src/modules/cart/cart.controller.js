const { addItemToCart, getCartWithItems } = require('./cart.service');

// POST /api/cart/:userId
async function addItem(req, res, next) {
  try {
    const { userId } = req.params;
    const { productId, quantity } = req.body;

    if (!productId) {
      const err = new Error('productId ist erforderlich');
      err.status = 400;
      return next(err);
    }

    const item = await addItemToCart(userId, productId, quantity || 1);
    res.status(201).json(item);
  } catch (err) {
    next(err);
  }
}

// GET /api/cart/:userId
async function getCart(req, res, next) {
  try {
    const cart = await getCartWithItems(req.params.userId);
    if (!cart) {
      const err = new Error('Warenkorb nicht gefunden');
      err.status = 404;
      return next(err);
    }
    res.json(cart);
  } catch (err) {
    next(err);
  }
}

module.exports = { addItem, getCart };
