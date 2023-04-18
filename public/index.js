$("#collect").click(function() {
    $.get("/collect-data", function(data) {
        console.log(data);
    });
});