const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const sgMail = require('@sendgrid/mail');
const { validationResult } = require('express-validator');

const User = require('../models/user');

sgMail.setApiKey(process.env.sendGridAPI);

exports.getLogin = (req, res, _next) => {
    let message = req.flash('error');
    let success = req.flash('success');
    if(message.length > 0) {
        message = message[0];
    }
    else {
        message = null;
    }
    if(success.length > 0) {
        success = success[0];
    }
    else {
        success = null;
    }
    res.render('auth/login', {
        title: 'התחברות',
        currentPage:'/login',
        errorMsg: message,
        successMsg: success,
        input: { email: '', password: '' },
        validationErrors: []
    })
}

exports.postLogin = (req, res, _next) => {
    const email = req.body.email;
    const password = req.body.password;
    const errors = validationResult(req);
    if(!errors.isEmpty()) {
        return res.status(422).render('auth/login', {
            title: 'התחברות',
            currentPage:'/login',
            errorMsg: errors.array()[0].msg,
            input: { email: email, password: password },
            validationErrors: errors.array()
        });
    }
    User.findOne({email: email})
    .then(user => {
        if(!user) {
            return res.status(422).render('auth/login', {
                title: 'התחברות',
                currentPage:'/login',
                errorMsg: 'כתובת מייל שגויה!',
                input: { email: email, password: password },
                validationErrors: [{param: 'email'}]
            })
        }
        bcrypt.compare(password, user.password)
        .then(passMatch => {
            if(passMatch) {
                req.session.isLoggedIn = true;
                req.session.user = user;
                return req.session.save(err => {
                    console.error(err);
                    res.redirect('/');
                })
            }
            return res.status(422).render('auth/login', {
                title: 'התחברות',
                currentPage:'/login',
                errorMsg: 'סיסמתך שגויה. אנא נסה שנית!',
                input: { email: email, password: password },
                validationErrors: [{param: 'password'}]
            })
        })
        .catch(err => {
            console.error(err);
            return res.redirect('/login');
        })
    })
    .catch(err => {
        console.error(err);
    })
}

exports.postLogout = (req, res, _next) => {
    req.session.destroy(err => {
        console.error(err);
        res.redirect('/');
    });
}

exports.getSignup = (req, res, _next) => {
    let message = req.flash('error');
    if(message.length > 0) {
        message = message[0];
    }
    else {
        message = null;
    }
    res.render('auth/signup', {
        title: 'הרשמה',
        currentPage:'/signup',
        errorMsg: message,
        input: { email: '', password: '', confirmPassword: '' },
        validationErrors: []
    })
}

exports.postSignup = (req, res, _next) => {
    const email = req.body.email;
    const password = req.body.password;
    const errors = validationResult(req);
    if(!errors.isEmpty()) {
        return res.status(422).render('auth/signup', {
            title: 'הרשמה',
            currentPage:'/signup',
            errorMsg: errors.array()[0].msg,
            input: { email: email, password: password, confirmPassword: req.body.confirmPassword },
            validationErrors: errors.array()
        });
    }
    bcrypt.hash(password, 12)
    .then(hashedPass => {
        const user = new User({
            email: email,
            password: hashedPass,
            cart: {items: []}
        });
        return user.save();
    })
    .then(result => {
        res.redirect('/login');
        const msg = {
            to: email,
            from: 'noreply@nodeapp.com',
            subject: 'נרשמת לחנות בהצלחה',
            text: 'רישומך לחנות בוצע בהצלחה!',
            html: '<strong>רישומך לחנות בוצע בהצלחה!</strong>',
        };
        sgMail.send(msg);
    });
}

exports.getReset = (req, res, next) => {
    let message = req.flash('error');
    let success = req.flash('success');
    if(message.length > 0) {
        message = message[0];
    }
    else {
        message = null;
    }
    if(success.length > 0) {
        success = success[0];
    }
    else {
        success = null;
    }
    res.render('auth/reset-pass', {
        title: 'שחזור סיסמה',
        currentPage:'/reset',
        errorMsg: message,
        successMsg: success,
        input: { email: '' },
        validationErrors: []
    })
}

exports.postReset = (req, res, next) => {
    const email = req.body.email;
    const errors = validationResult(req);
    if(!errors.isEmpty()) {
        return res.status(422).render('auth/reset-pass', {
            title: 'שחזור סיסמה',
            currentPage:'/reset',
            errorMsg: errors.array()[0].msg,
            input: { email: email },
            validationErrors: errors.array()
        });
    }
    crypto.randomBytes(32, (err, buffer) => {
        if(err) {
            return res.redirect('/reset');
        }
        const token = buffer.toString('hex');
        User.findOne({email: email})
        .then(user => {
            if(!user){
                req.flash('error', 'כתובת מייל זו לא רשומה במערכת!');
                return res.redirect('/reset');
            }
            user.resetToken = token;
            user.resetTokenExipration = Date.now() + (2 * 60 * 60 * 1000);
            return user.save();
        })
        .then(result => {
            const msg = {
                to: req.body.email,
                from: 'noreply@nodeapp.com',
                subject: 'שחזור סיסמה',
                text: 'מייל שחזור סיסמה',
                html: `
                <p>נרשמה אצלנו בקשה לשחזור סיסמה.</p>
                <p>במידה ולא אתה ביקשת לאפס את הסיסמה, התעלם ממייל זה.</p>
                <hr />
                <p>במידה וביקשת אתה לאפס את הסיסמה, <b><a href="http://localhost:3000/reset/${token}">לחץ כאן</a></b></p>
                <br /><br />
                <p>שים לב כי קישור זה תקף לשעתיים בלבד!</p>
                `,
            };
            sgMail.send(msg);
            req.flash('success', 'נשלחה לכתובת מייל זו בקשה לאיפוס סיסמה');
            res.redirect('/reset');
        })
        .catch(err => {
            console.error(err);
        })
    });
}

exports.getNewPassword = (req, res, next) => {
    const token = req.params.resetToken;
    User.findOne({ resetToken: token, resetTokenExipration: { $gt: Date.now() } })
    .then(user => {
        let message = req.flash('error');
        if(message.length > 0) {
            message = message[0];
        }
        else {
            message = null;
        }
        res.render('auth/reset-pass-form', {
            title: 'שחזור סיסמה',
            currentPage:'/reset',
            errorMsg: message,
            userId: user._id.toString(),
            passwordToken: token,
            input: { password: '' },
            validationErrors: []
        })
    })
    .catch(err => {
        console.error(err);
    })
}

exports.postNewPassword = (req, res, next) => {
    const userId = req.body.userId;
    const passwordToken = req.body.passwordToken;
    const newPassword = req.body.password;let retrievedUser;
    User.findOne({ _id: userId, resetToken: passwordToken, resetTokenExipration: { $gt: Date.now() } })
    .then(user => {
        retrievedUser = user;
        const errors = validationResult(req);
        if(!errors.isEmpty()) {
            return res.status(422).render('auth/reset-pass-form', {
                title: 'שחזור סיסמה',
                currentPage:'/reset',
                errorMsg: errors.array()[0].msg,
                userId: user._id.toString(),
                passwordToken: passwordToken,
                input: { password: newPassword, confirmPassword: req.body.confirmPassword },
                validationErrors: errors.array()
            })
        }
        return bcrypt.hash(newPassword, 12)
        .then(hashedPassword => {
            retrievedUser.password = hashedPassword;
            retrievedUser.resetToken = undefined;
            retrievedUser.resetTokenExipration = undefined;
            return retrievedUser.save();
        })
        .then(result => {
            req.flash('success', 'סיסמתך שונתה בהצלחה.');
            res.redirect('/login');
        })
    })
    .catch(err => {
        console.error(err);
    })  
}