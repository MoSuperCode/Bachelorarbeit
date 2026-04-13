const express = require('express');
const productRoutes = require('./product/product.routes');
const errorHandler  = require('./middleware/errorHandler');

const app = express();
app.use(express.json());

app.get('/health', (req, res) => res.json({ status: 'ok', service: 'product-service' }));
app.use('/products', productRoutes);
app.use(errorHandler);

module.exports = app;
