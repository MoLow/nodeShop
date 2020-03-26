let stripe = Stripe('pk_test_nMFiOXzuMt8wtj6TcZfdOOtg00VbK5rqVX');

let sessionId = $("#sessionId").val();

$("#order-btn").click(function() {
    stripe.redirectToCheckout({
        sessionId: sessionId
    });
})