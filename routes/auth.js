const express = require("express");
const { body } = require("express-validator");

const authController = require('../controllers/auth');
const User = require('../models/user');

const router = express.Router();

router.get('/login', authController.getLogin);

router.post('/login',
[
    body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('כתובת מייל לא תקינה!'),
    body('password', 'סיסמה צריכה להיות באורך 6 תווים לפחות!')
    .isLength({ min: 5 })
    .trim()
], authController.postLogin);

router.post('/logout', authController.postLogout);

router.get('/signup', authController.getSignup);

router.post('/signup',
[ 
    body('email')
    .isEmail()
    .withMessage('כתובת מייל לא תקינה!')
    .custom((value, {req}) => {
        if(value.includes("@test")) {
            throw new Error("דומיין זה איננו חוקי!");
        }
        return true;
    })
    .custom((value, {req}) => {
        return User.findOne({email: value})
        .then(userDoc => {
            if(userDoc) {
                return Promise.reject('כתובת מייל זו בשימוש!');
            }
        })
    })
    .normalizeEmail(),
    body('password', 'סיסמה צריכה להיות באורך 6 תווים לפחות!')
    .isLength({ min: 5 })
    .trim(),
    body('confirmPassword')
    .trim()
    .custom((value, { req }) => {
        if(value !== req.body.password) {
            throw new Error('על הסיסמאות להיות תואמות!');
        }
        return true;
    })
], authController.postSignup);

router.get('/reset', authController.getReset);

router.post('/reset', [
    body('email')
    .isEmail()
    .withMessage('כתובת מייל לא תקינה!')
    .custom((value) => {
        if(value.includes("@test")) {
            throw new Error("דומיין זה איננו חוקי!");
        }
        return true;
    })
    .normalizeEmail(),
], authController.postReset);

router.get('/reset/:resetToken', authController.getNewPassword);

router.post('/new-password',
[
    body('password', 'סיסמה צריכה להיות באורך 6 תווים לפחות!')
    .isLength({ min: 5 })
    .trim(),
    body('confirmPassword')
    .trim()
    .custom((value, { req }) => {
        if(value !== req.body.password) {
            throw new Error('על הסיסמאות להיות תואמות!');
        }
        return true;
    })
], authController.postNewPassword);

module.exports = router;