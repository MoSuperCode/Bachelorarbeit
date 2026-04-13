const express = require('express');
const cartRoutes   = require('./cart/cart.routes');
const errorHandler = require('./middleware/errorHandler');

const app = express();
app.use(express.json());

app.get('/health', (req, res) => res.json({ status: 'ok', service: 'cart-service' }));
app.use('/cart', cartRoutes);
app.use(errorHandler);

module.exports = app;
