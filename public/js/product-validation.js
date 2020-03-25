$("form.product-form").validate({
    normalizer: function( value ) {
        return $.trim( value );
    },
    rules: {
        title: {
            required: true,
            minlength: 3
        },
        image: {
            required: true,
            extension: "png|gif|jpg|jpeg",
            filesize: 5
        },
        price: {
            required: true,
            number: true,
        },
        description: {
            required: true,
            rangelength: [5,400],
        }
    },
    wrapper: "div",
    submitHandler: function(form) {
        form.submit();
    }, 
});