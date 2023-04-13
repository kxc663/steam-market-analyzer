$("#update").click(function() {
    $.get("/buff_summary", function (data, status) {
        console.log(data);
        list_data_on_html(data);
    });
});

function list_data_on_html(data){
    $("#dataTable").show();
    const tbody = document.getElementById("dataBody");
    data.slice(0, 100).forEach((item, index) => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td><img src="${item.icon_url}" width="50" height="50"></td>
            <td>${item.name}</td>
            <td>${item.buff_price}</td>
            <td><a href="${item.steam_market_url}">Steam Market</a></td>
        `;
        tbody.appendChild(tr);
    });
}

function get_data(){
    data = $.get("/buff_summary", function (data, status) {});
    return data;
}