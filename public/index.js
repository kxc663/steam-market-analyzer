let receivedData = {};

function init() {
    $("#displayTable").hide();
    if ($("#select").is(":checked")) {
        $("#searchInput").prop("disabled", true);
        $("#sort").prop("disabled", false);
    }
}

$("#update").click(function () {
    $.get("/update", function (data) {
        //console.log(data);
        receivedData = data;
        generateTable(data);
    });
});

$("#select").change(function () {
    const isChecked = $(this).is(":checked");
    $("#searchInput").prop("disabled", isChecked);
    $("#sort").prop("disabled", !isChecked);
});

$("#current").change(function () {
    const isChecked = $(this).is(":checked");
    $("#days").prop("disabled", isChecked);
});

$("#searchButton").click(async function () {
    const searchName = $("#searchInput").val().trim();
    if (searchName === "" && !$("#select").is(":checked")) {
        alert("Please enter a search query.");
        return;
    } else if ($("#select").is(":checked")) {
        $("#displayTable td").remove();
        let result = await searchAll();
        result = JSON.parse(result);
        switch ($("#sort").val()) {
            case "0":
                generateTable(result);
                break;
            case "1":
                generateTable(sortPrice(result, "asc"));
                break;
            case "2":
                generateTable(sortPrice(result, "desc"));
                break;
            case "3":
                generateTable(sortIncreasePecentage(result, "asc"));
                break;
            case "4":
                generateTable(sortIncreasePecentage(result, "desc"));
                break;
        }
    } else {
        try {
            const result = await searchWeapon(searchName);
            if (result != null) {
                $("#displayTable td").remove();
                generateTable(result);
            }
        } catch (error) {
            console.error("Error searching for weapon:", error);
        }
    }
});

async function searchWeapon(query) {
    const response = await $.get("/search", { q: query });
    if (response === "Not Found") {
        alert("No weapon found with that name.");
        return;
    } else if (response.error) {
        throw new Error(response.error);
    } else {
        var product = {};
        product[query] = response;
        return product;
    }
}

async function searchAll() {
    const response = $.get("/update", function (data) { });
    return response;
}

function sortPrice(data, order) {
    const sortedData = {};
    const sortedKeys = Object.keys(data).sort((a, b) => {
        const aPrice = data[a][data[a].length - 2].price;
        const bPrice = data[b][data[b].length - 2].price;
        if (order === "asc") {
            return aPrice - bPrice;
        } else {
            return bPrice - aPrice;
        }
    });
    sortedKeys.forEach((key) => {
        sortedData[key] = data[key];
    }
    );
    return sortedData;
}

function sortIncreasePecentage(data, order) {
    const sortedData = {};
    const sortedKeys = Object.keys(data).sort((a, b) => {
        const aPercentage = getPriceIncrementPercentage(data[a], $("#days").val());
        const bPercentage = getPriceIncrementPercentage(data[b], $("#days").val());
        const hasData = aPercentage != "less" && aPercentage != "Not enough data" && bPercentage != "less" && bPercentage != "Not enough data";
        if (order === "asc" && hasData) {
            return aPercentage - bPercentage;
        } else if (order === "desc" && hasData) {
            return bPercentage - aPercentage;
        } else if (aPercentage == "less" || aPercentage == "Not enough data" && bPercentage != "less" && bPercentage != "Not enough data") {
            return 1;
        } else if (bPercentage == "less" || bPercentage == "Not enough data" && aPercentage != "less" && aPercentage != "Not enough data") {
            return -1;
        } else {
            return 0;
        }
    });
    sortedKeys.forEach((key) => {
        sortedData[key] = data[key];
    }
    );
    return sortedData;
}

function generateTable(data) {
    $("#displayTable").show();
    const tableBody = document.getElementById("tableBody");
    for (const name in data) {
        const weaponData = data[name];
        const currentPrice = weaponData[weaponData.length - 2].price;
        const iconUrl = weaponData[weaponData.length - 1].icon;
        const row = document.createElement("tr");
        const nameCell = document.createElement("td");
        nameCell.textContent = name;
        row.appendChild(nameCell);
        const iconCell = document.createElement("td");
        const iconImg = document.createElement("img");
        iconImg.src = iconUrl;
        iconImg.width /= 3;
        iconImg.height /= 3;
        iconCell.appendChild(iconImg);
        row.appendChild(iconCell);
        const priceCell = document.createElement("td");
        priceCell.textContent = `$${currentPrice.toFixed(2)}`;
        row.appendChild(priceCell);
        const days = $("#days").val();
        const priceIncrementPercentage = getPriceIncrementPercentage(weaponData, days);
        const priceIncreaseCell = document.createElement("td");
        if (priceIncrementPercentage != "less" && priceIncrementPercentage != "Not enough data") {
            priceIncreaseCell.textContent = `${priceIncrementPercentage.toFixed(2)}%`;
        } else {
            priceIncreaseCell.textContent = "--";
        }
        row.appendChild(priceIncreaseCell);
        tableBody.appendChild(row);
    }
}

function getPriceIncrementPercentage(data, days) {
    const dataLength = data.length;
    if (dataLength < 2) {
        return "less";
    }
    const mostRecentData = data[dataLength - 2];
    const daysAgoIndex = dataLength - 1 - (days * 24); // Assuming there is one data point per hour
    if (daysAgoIndex < 0) {
        return "Not enough data";
    }
    const daysAgoData = data[daysAgoIndex];
    const startingPrice = daysAgoData.price;
    const endingPrice = mostRecentData.price;
    const priceIncrementPercentage = ((endingPrice - startingPrice) / startingPrice) * 100;
    return priceIncrementPercentage;
}

init();
