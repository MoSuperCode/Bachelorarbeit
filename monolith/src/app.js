const express = require('express');

const productRoutes  = require('./modules/product/product.routes');
const cartRoutes     = require('./modules/cart/cart.routes');
const orderRoutes    = require('./modules/order/order.routes');
const errorHandler   = require('./middleware/errorHandler');

const app = express();

// JSON Request-Body parsen
app.use(express.json());

// Health Check — für Docker-Healthcheck und Load Balancer
app.get('/health', (req, res) => res.json({ status: 'ok' }));

// Domänen-Routen registrieren — jede Domäne verwaltet ihre eigene Router-Logik
app.use('/api/products', productRoutes);
app.use('/api/cart',     cartRoutes);
app.use('/api/orders',   orderRoutes);

// Zentrale Fehlerbehandlung — muss als letztes Middleware registriert werden
app.use(errorHandler);

module.exports = app;
