const { getAllProducts, getProductById } = require('./product.service');

// GET /api/products?page=1&limit=20
async function listProducts(req, res, next) {
  try {
    const page  = parseInt(req.query.page)  || 1;
    const limit = Math.min(parseInt(req.query.limit) || 20, 100); // max 100
    const products = await getAllProducts({ page, limit });
    res.json(products);
  } catch (err) {
    next(err);
  }
}

// GET /api/products/:id
async function getProduct(req, res, next) {
  try {
    const product = await getProductById(parseInt(req.params.id));
    if (!product) {
      const err = new Error('Produkt nicht gefunden');
      err.status = 404;
      return next(err);
    }
    res.json(product);
  } catch (err) {
    next(err);
  }
}

module.exports = { listProducts, getProduct };
