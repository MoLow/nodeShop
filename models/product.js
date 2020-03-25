const mongoose = require('mongoose');

const User = require('./user');

const Schema = mongoose.Schema;

const productSchema = new Schema({
    title: {
        type: String,
        required: true
    },
    price: {
        type: Number,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    imageUrl: {
        type: String,
        required: true
    },
    userId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }
});

productSchema.statics.deleteProduct = function (productId, userId, callback, errCall) {
    this.deleteOne({_id: productId, userId: userId})
    .then(() => {
        return User.find({
            "cart.items.productId": productId
        })
    })
    .then(users => {
        users.forEach(user => {
            user.removeFromCart(productId)
        });
        callback();
    })
    .catch(err => {
        const error = new Error(err);
        error.httpStatusCode = 500;
        error.iwMsg = 'תקלה בקבלת מוצרים מהשרת.';
        errCall(error);
    });
}

module.exports = mongoose.model('Product', productSchema);