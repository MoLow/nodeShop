exports.get404 = (req, res, next) => {
    res.status(404).render('404', {
        title: 'העמוד לא נמצא',
        currentPage: '/404'
    })
};

exports.get500 = (req, res, _next) => {
    const f = req.flash('error');
    let error = {
        message: '',
        iwMsg: '',
        httpStatusCode: 500
    }
    if(f.length > 0) {
        error = f[0];
    }
    res.status(error.httpStatusCode).render('500', {
        title: 'שגיאה!',
        currentPage: '/500',
        error: error
    })
};