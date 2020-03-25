const fs = require('fs');
const path = require('path');

const PDFDocument = require('../util/pdfkit-tables');

const Product = require('../models/product');
const Order = require('../models/order');

exports.getIndex = (req, res, _next) => {
    Product.find()
    .then(products => {
        res.render('shop/index', {
            prods: products,
            title: 'עמוד הבית',
            currentPage: 'home',
        })
    })
    .catch(err => {
        console.log(err);
    });
};

exports.getProducts = (req, res, _next) => {
    Product.find()
    .then(products => {
        res.render('shop/product-list', {
            prods: products,
            title: 'חנות',
            currentPage: 'products',
        });
    })
    .catch(err => {
        console.log(err);
    });
};

exports.getProductDetails = (req, res, next) => {
    const prodId = req.params.productId;
    Product.findById(prodId)
    .then(product => {
        if(!product)
        return next();
        res.render('shop/product-detail', {
            product: product,
            title: product.title,
            currentPage: 'products',
        });
    })
    .catch(err => {
        console.error(err);
    });
};

exports.getCart = (req, res, _next) => {
    req.user
    .populate('cart.items.productId')
    .execPopulate()
    .then(user => {
        res.render('shop/cart', {
            title: 'עגלת קניות',
            products: user.cart.items,
            currentPage:'cart',
        })
    }).catch(err => {
        console.error(err);
    })
};

exports.postCart = (req, res, _next) => {
    const prodId = req.body.productId;
    Product.findById(prodId)
    .then(product => {
        return req.user.addToCart(product);
    }).then(_result => {
        res.redirect('/cart');
    })
    .catch(err => {
        console.error(err);
    })
};

exports.postCartDeleteProduct = (req, res, _next) => {
    const productId = req.body.productId;
    req.user.removeFromCart(productId)
    .then(_result => {
        res.redirect('/cart');
    })
    .catch(err => {
        console.error(err);
    })
};

exports.getOrders = (req, res, _next) => {
    Order.find({'user.userId': req.user._id})
    .then(orders => {
        res.render('shop/orders', {
            title: 'הזמנות',
            orders: orders,
            currentPage:'orders',
        })
    })
    .catch(err => {
        console.error(err);
    })
};

exports.postOrder = (req, res, next) => {
    req.user
    .populate('cart.items.productId')
    .execPopulate()
    .then(user => {
        const products = user.cart.items.map(i => {
            return {quantity: i.quantity, product: { ...i.productId._doc }}
        });
        const order = new Order({
            user: {
                email: req.user.email,
                userId: req.user
            },
            products: products
        });
        return order.save();
    })
    .then(_result => {
        return req.user.clearCart();
    })
    .then(() => {
        res.redirect('/orders');
    })
    .catch(err => {
        console.error(err);
    })
}

exports.getInvoice = (req, res, next) => {
    const orderId = req.params.orderId;
    const invoiceName = `invoice_${orderId}.pdf`;
    const invoicePath = path.join('data', 'invoices', invoiceName);
    Order.findOne({_id: orderId, "user.userId": req.session.user._id})
    .then(order => {
        if(!order) {
            const error = new Error("This order was made by another user, you aren't privliged to this invoice!");
            error.httpStatusCode = 500;
            error.iwMsg = 'לא הוענקה לך גישה לקבלה זו.';
            return next(error);
        }
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `inline; filename="${invoiceName}"`);//attachment
        const pdfDoc = new PDFDocument();
        pdfDoc.pipe(fs.createWriteStream(invoicePath));
        pdfDoc.pipe(res);
        pdfDoc.registerFont('Heebo', path.join('public', 'fonts', 'Heebo-Regular.ttf'));
        pdfDoc.registerFont('HeeboBold', path.join('public', 'fonts', 'Heebo-Black.ttf'));
        pdfDoc.fontSize(23).font('HeeboBold').text(`${orderId} - מספר  קבלה`, { align: 'center', underline: true });
        pdfDoc.font('Heebo').text('\n\n-----------------------\n\n\n', { align: 'center' });
        let totalPrice = 0;
        let product;
        let productPrice;
        const table = {
            headers: ['סה"כ', 'ליחידה  מחיר', 'כמות', 'פריט'],
            rows:[]
        }
        order.products.forEach(prodOrder => {
            product = prodOrder.product;
            productPrice = product.price * prodOrder.quantity;
            totalPrice += productPrice;
            table.rows.push([productPrice, product.price, prodOrder.quantity, product.title]);
        });
        pdfDoc.table(table, {
            prepareHeader: () => pdfDoc.fontSize(19),
            prepareRow: (row, i) => pdfDoc.fontSize(16)
        });
        pdfDoc.fontSize(16).text(`\n\n: הכל  סך\n$${totalPrice}`, {align:'right'});
        pdfDoc.end();
    })
    .catch(err => {
        const error = new Error(err);
        error.httpStatusCode = 500;
        error.iwMsg = 'תקלה בגישה לבסיס המידע!';
        return next(error);
    })
}