const { validationResult } = require('express-validator');

const Product = require('../models/product');
const User = require('../models/user');
const fileHelper = require('../util/file');

const ITEMS_PER_PAGE =  +process.env.ITEMS_PER_PAGE;

exports.getAddProduct = (req, res, _next) => {
    res.render('admin/edit-product', {
        title: 'הוסף פריט',
        currentPage: 'admin/add-product',
        editing: false,
        hasError: false,
        errorMsg: []
    })
};

exports.postAddProduct = (req, res, next) => {
    const title = req.body.title;
    const price = req.body.price;
    const description = req.body.description;
    const image = req.file;
    const errorBehavior = (errors) => {
        res.status(422).render('admin/edit-product', {
            title: 'הוסף פריט',
            currentPage: 'admin/add-product',
            product: {
                title: title,
                price: price,
                description: description
            },
            editing: false,
            hasError: true,
            errorMsg: errors
        })
    };
    if(!image) {
        return errorBehavior(['קובץ מצורף אינו תמונה, או שהוא חורג מהמשקל המותר!']);
    }
    const errors = validationResult(req);
    if(!errors.isEmpty()) {
        return errorBehavior(errors.array());
    }
    const imageUrl = '/images/' + image.filename;
    const product = new Product({
        title: title,
        price: price,
        description: description,
        imageUrl: imageUrl,
        userId: req.user
    });
    product.save()
    .then(() => {
        res.redirect('/admin/products');
    }).catch(err => {
        const error = new Error(err);
        error.httpStatusCode = 500;
        error.iwMsg = 'תקלה ביצירת מוצר חדש.';
        return next(error);
    })
};

exports.getProducts = (req, res, next) => {
    const page = +req.query.p || 1;
    let totalProducts;
    Product.find({ userId: req.user._id }).countDocuments()
    .then(prodCount => {
        totalProducts = prodCount;
        return Product.find({ userId: req.user._id })
        .skip((page - 1) * ITEMS_PER_PAGE)
        .limit(ITEMS_PER_PAGE);
    })
    .then(products => {
        res.render('admin/product-list', {
            prods: products,
            title: 'ניהול פריטים',
            currentPage: 'admin/products',
            hasNextPage: ITEMS_PER_PAGE * page < totalProducts,
            hasPrevPage: page > 1,
            currPage: page,
            nextPage: page + 1,
            prevPage: page - 1,
            lastPage: Math.ceil(totalProducts / ITEMS_PER_PAGE),
        })
    }).catch(err => {
        const error = new Error(err);
        error.httpStatusCode = 500;
        error.iwMsg = 'תקלה בקבלת מוצרים מהשרת.';
        return next(error);
    })
};

exports.getEditProduct = (req, res, next) => {
    const editMode = req.query.edit;
    if(!editMode) {
        return res.redirect('/');
    }
    const productId = req.params.productId;
    Product.findOne({_id: productId, userId: req.session.user._id})
    .then(product => {
        if(!product) {
            const error = new Error("The product dosen't exist, or you arent privliged of editing it.");
            error.httpStatusCode = 500;
            error.iwMsg = 'המוצר שניסית לערוך לא קיים, או שאין לך הרשאות לשנות אותו!';
            return next(error);
        }
        res.render('admin/edit-product', {
            title: 'ערוך פריט',
            product: product,
            editing: editMode,
            hasError: false,
            errorMsg: []
        })
    }).catch(err => {
        const error = new Error(err);
        error.httpStatusCode = 500;
        error.iwMsg = 'תקלה בקבלת מוצרים מהשרת.';
        return next(error);
    })
};
exports.postEditProduct = (req, res, next) => {
    const productId = req.body.productId;
    const title = req.body.title;
    const price = req.body.price;
    const description = req.body.description;
    const image = req.file;
    const errors = validationResult(req);
    if(!errors.isEmpty()) {
        return res.status(422).render('admin/edit-product', {
            title: 'ערוך פריט',
            product: {
                _id: productId,
                title: title,
                price: price,
                description: description
            },
            editing: true,
            hasError: true,
            errorMsg: errors.array()
        })
    }
    Product.findById(productId)
    .then(product => {
        if(product.userId.toString() !== req.user._id.toString()) {
            const error = new Error("You are not the owner of this item!");
            error.httpStatusCode = 500;
            error.iwMsg = 'נחסמה בקשתך לערוך מוצרים שאינם שלך.';
            return next(error);
        }
        product.title = title;
        product.price = price;
        product.description = description;
        if(image) {
            fileHelper.deleteFile(product.imageUrl);
            product.imageUrl = '/images/' + image.filename;
        }
        return product.save()
        .then(() => {
            res.redirect('/admin/products');
        })
    })
    .catch(err => {
        const error = new Error(err);
        error.httpStatusCode = 500;
        error.iwMsg = 'תקלה בשמירת העדכון לשרת.';
        return next(error);
    })
}

exports.deleteProduct = (req, res, next) => {
    const productId = req.params.productId;
    Product.findOneAndRemove({_id: productId, userId: req.user._id})
    .then(product => {
        if(!product) {
            const error = new Error("Error: no such product exists!");
            throw error;
        }
        fileHelper.deleteFile(product.imageUrl);
        return User.find({ "cart.items.productId": productId });
    })
    .then(users => {
        users.forEach(user => {
            user.removeFromCart(productId)
        });
        res.status(200).json({msg: 'נמחק בהצלחה'});
    })
    .catch(err => {
        res.status(500).json({msg:'תקלה במחיקת מוצרים מהשרת.', error: err});
        const error = new Error(err);
        error.httpStatusCode = 500;
        error.iwMsg = '';
        return next(err)
    });
}