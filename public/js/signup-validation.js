$("form.login-form").validate({
    rules: {
        email: {
            required: true,
            email: true,
            nonTest: true,
            normalizer: function( value ) {
                return $.trim( value );
            }
        },
        password: {
            required: true,
            minlength: 5
        },
        confirmPassword: {
            equalTo: "#password",
            required: true,
            minlength: 5
        }
    },
    wrapper: "div",
    submitHandler: function(form) {
        form.submit();
    }, 
});