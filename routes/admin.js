const express = require("express");
const { body } = require("express-validator");

const adminController = require("../controllers/admin");
const isAuth = require("../middleware/is-auth");

const router = express.Router();

router.get('/add-product', isAuth, adminController.getAddProduct);

router.post('/add-product', [
    body('title', 'שם הספר צריך להיות ארוך מ3 תווים!')
    .trim()
    .isLength({ min: 3 }),
    //body('imageUrl').isURL().trim().withMessage('כתובת התמונה צריכה להיות קישור תקין'),
    body('price').isFloat().withMessage('המחיר צריך להיות מספר עשרוני'),
    body('description').trim().isLength({ min: 5, max: 400 }).withMessage('התיאור צריך להיות מעל 5 תווים ופחות מ400')
], isAuth, adminController.postAddProduct);

router.get('/products', isAuth, adminController.getProducts);

router.get('/edit-product/:productId', isAuth, adminController.getEditProduct);

router.post('/edit-product/', [
    body('title', 'שם הספר צריך להיות ארוך מ3 תווים!')
    .isLength({ min: 3 })
    .trim(),
    // body('imageUrl').isURL().trim().withMessage('כתובת התמונה צריכה להיות קישור תקין'),
    body('price').isFloat().withMessage('המחיר צריך להיות מספר עשרוני'),
    body('description').trim().isLength({ min: 5, max: 400 }).withMessage('התיאור צריך להיות מעל 5 תווים ופחות מ400')
], isAuth, adminController.postEditProduct);

router.post('/delete-product/', isAuth, adminController.postDeleteProduct);


module.exports = router;