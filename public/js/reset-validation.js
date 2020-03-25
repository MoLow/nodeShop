$("form.login-form").validate({
    normalizer: function( value ) {
        return $.trim( value );
    },
    rules: {
        email: {
            required: true,
            email: true,
            nonTest: true
        }
    },
    wrapper: "div",
    submitHandler: function(form) {
        form.submit();
    }, 
});