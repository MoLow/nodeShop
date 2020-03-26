let product;
let productId = $("#productId").val();
$(".card__actions").on("click", ".btn.del", e => {
    product = $(e.target).parents("article");
    let csrfToken = $(product).find("input[name='_csrf']").val();
    let productId = $(product).find("input[name='productId']").val();
    console.warn("delete!",productId);
    
    fetch(`/admin/product/${productId}`, {
        method: 'DELETE',
        headers: {
            'csrf-token': csrfToken
        }
    })
    .then(result => {
        return result.json();
    })
    .then(json => {
        console.log(json);
        product.hide(333, function() {
            this.remove();
        });
    })
    .catch(err => {
        console.error(err)
    })
})