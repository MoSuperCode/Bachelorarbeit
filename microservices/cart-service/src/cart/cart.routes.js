const { Router } = require('express');
const { addItem, getCart, emptyCart } = require('./cart.controller');

const router = Router();

router.post('/:userId',        addItem);   // POST   /cart/:userId
router.get('/:userId',         getCart);   // GET    /cart/:userId
router.delete('/:userId/items', emptyCart); // DELETE /cart/:userId/items

module.exports = router;
