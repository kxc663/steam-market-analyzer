const PORT = 8000
const express = require('express');
const fs = require("fs");
const cors = require('cors');
const path = require('path');
const cheerio = require('cheerio');

const app = express();
app.use(cors());
app.use(express.urlencoded({ extended: true }));
const static_path = path.join(__dirname, "public");
app.use(express.static(static_path));

const https = require('https');

const baseUrl = 'https://steamcommunity.com/market/search';
const appid = 730;

const products = {};
// get the data from the market using url above
function getMarketData(url) {
    return new Promise((resolve, reject) => {
        https.get(url, (res) => {
            let data = '';
            res.on('data', (chunk) => {
                data += chunk;
            });
            res.on('end', () => {
                resolve(data);
            });
        }).on('error', (err) => {
            reject(err);
        });
    });
}

const getAllPagesHtml = async () => {
    const maxPages = 1; // Maximum number of pages to fetch
    const pageHtml = [];
    const productUrls = [];
    const productHtml = [];
    for (let i = 1; i <= maxPages; i++) {
        // url format: https://steamcommunity.com/market/search?appid=730#p1
        page_url = `${baseUrl}?appid=${appid}#p${i}`;
        await getMarketData(page_url).then((html) => {
            pageHtml.push(html);
            const $ = cheerio.load(html);
            $('.market_listing_row_link').each((index, element) => {
                productUrls.push($(element).attr('href'));
            });
        });
        console.log("page" + i + "success");
        await new Promise(r => setTimeout(r, 5000)); // Wait 5 seconds before fetching next page
    }
    console.log("productURL success!");

    for (let i = 0; i < productUrls.length - 5; i++) {
        const html = await getMarketData(productUrls[i]);
        const $ = cheerio.load(html);
        const name = $('.market_listing_item_name').text().trim();
        const icon_src = $('.market_listing_item_img').attr('srcset');
        productHtml.push(html);
        console.log("product" + i + " success")
        const priceHistoryData = getPriceHistoryData(html);
        priceHistoryData.push({ icon: icon_src });
        products[name] = priceHistoryData;
        console.log(products);
        await new Promise(r => setTimeout(r, 5000)); // Wait 5 seconds before fetching next page
    }
    fs.writeFile("data.json", JSON.stringify(products), "utf8", function (err) {
        if (err) {
            console.log(err);
        }
    });
    return products;
};

const getPriceHistoryData = (html) => {
    const $ = cheerio.load(html);
    const priceHistoryData = [];
    const scriptContent = $('script:contains("var line1")').html();
    const startIndex = scriptContent.indexOf('[[');
    const endIndex = scriptContent.indexOf(']]');
    const dataString = scriptContent.substring(startIndex, endIndex + 2);
    const dataArray = JSON.parse(dataString);
    dataArray.forEach((data) => {
        const date = data[0];
        const price = data[1];
        const volume = data[2];
        priceHistoryData.push({ date, price, volume });
    });
    return priceHistoryData;
};

function getPriceIncrementPercentage(data, days) {
    const dataLength = data.length;
    if (dataLength < 2) {
        throw new Error("Not enough data points to calculate percentage.");
    }
    const mostRecentData = data[dataLength - 1];
    const daysAgoIndex = dataLength - 1 - (days * 24); // Assuming there is one data point per hour
    if (daysAgoIndex < 0) {
        throw new Error("Not enough data points to go back the specified number of days.");
    }
    const daysAgoData = data[daysAgoIndex];
    const startingPrice = daysAgoData.price;
    const endingPrice = mostRecentData.price;
    const priceIncrementPercentage = ((endingPrice - startingPrice) / startingPrice) * 100;
    return priceIncrementPercentage;
}

app.get('/update', async (req, res) => {
    // if data.json is not empty, then send the data.json
    // if data.json is empty or not exist, then update
    if (fs.existsSync("data.json") == false || fs.readFileSync("data.json", "utf8") == "") {
        const data = await getAllPagesHtml();
        res.send(data);
    } else {
        res.send(fs.readFileSync("data.json", "utf8"));
    }
    console.log("Update Success");
});

app.get('/search', (req, res) => {
    const name = req.query.q;
    console.log(name);
    const data = JSON.parse(fs.readFileSync("data.json", "utf8"));
    if (name in data) {
        res.send(data[name]);
    } else {
        res.send("Not Found");
    }
});

app.listen(PORT, () => console.log(`Listening on PORT ${PORT}`));
