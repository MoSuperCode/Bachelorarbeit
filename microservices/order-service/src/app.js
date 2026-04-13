const express = require('express');
const orderRoutes  = require('./order/order.routes');
const errorHandler = require('./middleware/errorHandler');

const app = express();
app.use(express.json());

app.get('/health', (req, res) => res.json({ status: 'ok', service: 'order-service' }));
app.use('/orders', orderRoutes);
app.use(errorHandler);

module.exports = app;
