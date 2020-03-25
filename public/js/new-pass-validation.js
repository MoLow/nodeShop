$("form.login-form").validate({
    rules: {
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