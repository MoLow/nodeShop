const { validationResult } = require('express-validator');

const Product = require('../models/product');

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
    Product.find({ userId: req.user._id })
    .then(products => {
        res.render('admin/product-list', {
            prods: products,
            title: 'ניהול פריטים',
            currentPage: 'admin/products',
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

exports.postDeleteProduct = (req, res, next) => {
    const productId = req.body.productId;
    Product.deleteProduct(productId, req.user._id, () => {
        res.redirect('/admin/products');
    }, (err => {
        return next(err);
    }))
}