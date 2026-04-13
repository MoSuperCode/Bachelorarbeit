const { addItemToCart, getCartWithItems, clearCart } = require('./cart.service');

// POST /cart/:userId
async function addItem(req, res, next) {
  try {
    const { productId, quantity } = req.body;
    if (!productId) {
      const err = new Error('productId ist erforderlich'); err.status = 400; return next(err);
    }
    const item = await addItemToCart(req.params.userId, productId, quantity || 1);
    res.status(201).json(item);
  } catch (err) { next(err); }
}

// GET /cart/:userId
async function getCart(req, res, next) {
  try {
    const cart = await getCartWithItems(req.params.userId);
    if (!cart) {
      const err = new Error('Warenkorb nicht gefunden'); err.status = 404; return next(err);
    }
    res.json(cart);
  } catch (err) { next(err); }
}

// DELETE /cart/:userId/items — interner Endpunkt für den Order Service
async function emptyCart(req, res, next) {
  try {
    await clearCart(req.params.userId);
    res.json({ success: true });
  } catch (err) { next(err); }
}

module.exports = { addItem, getCart, emptyCart };
