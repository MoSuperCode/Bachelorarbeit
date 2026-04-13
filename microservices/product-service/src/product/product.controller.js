const { getAllProducts, getProductById, checkStock, decrementStock } = require('./product.service');

// GET /products
async function listProducts(req, res, next) {
  try {
    const page  = parseInt(req.query.page)  || 1;
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    res.json(await getAllProducts({ page, limit }));
  } catch (err) { next(err); }
}

// GET /products/:id
async function getProduct(req, res, next) {
  try {
    const product = await getProductById(parseInt(req.params.id));
    if (!product) {
      const err = new Error('Produkt nicht gefunden'); err.status = 404; return next(err);
    }
    res.json(product);
  } catch (err) { next(err); }
}

// GET /products/:id/stock?quantity=N
// Interner Endpunkt – wird vom Order Service per HTTP aufgerufen
async function stockCheck(req, res, next) {
  try {
    const quantity = parseInt(req.query.quantity) || 1;
    const available = await checkStock(parseInt(req.params.id), quantity);
    res.json({ available });
  } catch (err) { next(err); }
}

// PATCH /products/:id/stock  body: { quantity }
// Interner Endpunkt – wird vom Order Service per HTTP aufgerufen
async function stockDecrement(req, res, next) {
  try {
    await decrementStock(parseInt(req.params.id), parseInt(req.body.quantity));
    res.json({ success: true });
  } catch (err) { next(err); }
}

module.exports = { listProducts, getProduct, stockCheck, stockDecrement };
