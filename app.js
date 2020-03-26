const path = require("path");

const express = require("express");
const favicon = require('serve-favicon')
const bodyParser = require("body-parser");
const multer = require("multer");
const mongoose = require("mongoose");
const session = require('express-session');
const MongoDbStore = require('connect-mongodb-session')(session);
const csrf = require('csurf');
const flash = require('connect-flash');

const errorsController = require("./controllers/errors");
const User = require("./models/user");

const MONGODB_URI = process.env.MONGIDB_URI;

const app = express();
const store = new MongoDbStore({
    uri: MONGODB_URI,
    collection: 'sessions'
});
const csrfProtection = csrf(); 

const fileStorage = multer.diskStorage({
    destination: (req, file, callback) => {
        callback(null, 'public/images');
    },
    filename: (req, file, callback) => {
        callback(null, `${+new Date()}_${file.originalname}`);
    }
});

const fileFilter = (req, file, callback) => {
    const bool = file.mimetype === 'image/png' || file.mimetype === 'image/gif' || file.mimetype === 'image/jpg' || file.mimetype === 'image/jpeg';
    callback(null, bool)
};

app.set('view engine', 'pug');
app.set('views', 'views');

const admin = require('./routes/admin');
const shop = require('./routes/shop');
const auth = require('./routes/auth');

app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')))
app.use(bodyParser.urlencoded({extended: false}));
app.use(multer({ storage: fileStorage, fileFilter: fileFilter, limits: { fileSize: 5 * 1024 * 1024 /*4MB*/ } }).single('image'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(
    session({
        secret: process.env.sessionSecret,
        resave: false,
        saveUninitialized: false ,
        store: store
}));
app.use(csrfProtection);
app.use(flash());

app.use((req, res, next) => {
    res.locals.isAuthenticated = req.session.isLoggedIn;
    res.locals.csrfToken = req.csrfToken();
    next();
})

app.use((req, _res, next) => {
    if(!req.session.user) {
        return next();
    }
    User.findById(req.session.user._id)
    .then(user => {
        if(!user) {
            return next();
        }
        req.user = user;
        next();
    })
    .catch(err => {
        const error = new Error(err);
        error.httpStatusCode = 500;
        error.iwMsg = 'תקלה בהתחברות.';
        next(error);
    })
})

app.use('/admin', admin);
app.use(shop);
app.use(auth);

// app.get('/500', errorsController.get500);

app.use(errorsController.get404);

app.use((error, req, res, next) => {
    res.status(error.httpStatusCode || 500).render('500', {
        title: 'שגיאה!',
        currentPage: '/500',
        error: error
    })
});

const port = process.env.PORT || 3000;

mongoose.connect(MONGODB_URI, {useNewUrlParser: true, useUnifiedTopology: true, useFindAndModify: false})
.then(result => {
    app.listen(port, function() {
        //console.log(`Our app is running on ${this.address().port}`, app.settings.env+ port);
    });
})
.catch(err => {
    console.error(err);
})