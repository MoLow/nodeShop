const fs = require('fs');
const path = require('path');

const PDFDocument = require('../util/pdfkit-tables');

const Product = require('../models/product');
const Order = require('../models/order');

const ITEMS_PER_PAGE = 1;

exports.getIndex = (req, res, _next) => {
    const page = +req.query.p || 1;
    let totalProducts;
    Product.find().countDocuments()
    .then(prodCount => {
        totalProducts = prodCount;
        return Product.find()
        .skip((page - 1) * ITEMS_PER_PAGE)
        .limit(ITEMS_PER_PAGE);
    })
    .then(products => {
        res.render('shop/index', {
            prods: products,
            title: 'עמוד הבית',
            currentPage: 'home',
            hasNextPage: ITEMS_PER_PAGE * page < totalProducts,
            hasPrevPage: page > 1,
            currPage: page,
            nextPage: page + 1,
            prevPage: page - 1,
            lastPage: Math.ceil(totalProducts / ITEMS_PER_PAGE),
        })
    })
    .catch(err => {
        const error = new Error(err);
        error.httpStatusCode = 500;
        error.iwMsg = 'תקלה בגישה לבסיס המידע!';
        return next(error);
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
        const error = new Error(err);
        error.httpStatusCode = 500;
        error.iwMsg = 'תקלה בגישה לבסיס המידע!';
        return next(error);
    });
};

exports.getProductDetails = (req, res, next) => {
    const prodId = req.params.productId;
    Product.findById(prodId)
    .then(product => {
        if(!product){
            return next();
        }
        res.render('shop/product-detail', {
            product: product,
            title: product.title,
            currentPage: 'products',
        });
    })
    .catch(err => {
        const error = new Error(err);
        error.httpStatusCode = 500;
        error.iwMsg = 'אירעה שגיאה בניסיון לקבל מידע על מוצר זה!';
        return next(error);
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
        const error = new Error(err);
        error.httpStatusCode = 500;
        error.iwMsg = 'תקלה בגישה לבסיס המידע!';
        return next(error);
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
        const error = new Error(err);
        error.httpStatusCode = 500;
        error.iwMsg = 'אירעה תקלה בהוספה לעגלת הקניות!';
        return next(error);
    })
};

exports.postCartDeleteProduct = (req, res, _next) => {
    const productId = req.body.productId;
    req.user.removeFromCart(productId)
    .then(_result => {
        res.redirect('/cart');
    })
    .catch(err => {
        const error = new Error(err);
        error.httpStatusCode = 500;
        error.iwMsg = 'אירעה תקלה במחיקת מוצר מהעגלה!';
        return next(error);
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
        const error = new Error(err);
        error.httpStatusCode = 500;
        error.iwMsg = 'תקלה בגישה לבסיס המידע!';
        return next(error);
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
        const error = new Error(err);
        error.httpStatusCode = 500;
        error.iwMsg = 'תקלה בביצוע הזמנה! אנא נסה שנית.';
        return next(error);
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
        res.setHeader('Content-Disposition', `attachment; filename="${invoiceName}"`);//inline
        fs.access(invoicePath, fs.constants.F_OK, (err) => {
            if (err) {
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
            } else {
                const file = fs.createReadStream(invoicePath);
                file.pipe(res);
            }
        });
        
        
    })
    .catch(err => {
        const error = new Error(err);
        error.httpStatusCode = 500;
        error.iwMsg = 'תקלה בגישה לבסיס המידע!';
        return next(error);
    })
}