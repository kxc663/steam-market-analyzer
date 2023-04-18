const PORT = 8000
const express = require('express');

const app = express();
const cors = require('cors');
const path = require('path');
const cheerio = require('cheerio');

app.use(cors());
app.use(express.urlencoded({ extended: true }));
const static_path = path.join(__dirname, "public");
app.use(express.static(static_path));

const https = require('https');

const baseUrl = 'https://steamcommunity.com/market/search';
const appid = 730;

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
        await new Promise(r => setTimeout(r, 2000)); // Wait 2 seconds before fetching next page
    }
    console.log("productURL success!");
    const products = {};
    for (let i = 0; i < productUrls.length; i++) {
        const html = await getMarketData(productUrls[i]);
        const $ = cheerio.load(html);
        const name = $('.market_listing_item_name').text().trim();
        productHtml.push(html);
        console.log("product" + i + "success")
        const priceHistoryData = getPriceHistoryData(html);
        products[name] = priceHistoryData;
        console.log(products);
        console.log(getPriceIncreasePercentage(priceHistoryData, 7));
        await new Promise(r => setTimeout(r, 2000)); // Wait 2 seconds before fetching next page
    }
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

function getCurrentPrice(priceHistoryData) {
    return priceHistoryData[priceHistoryData.length - 1].price;
}

function getPriceIncreasePercentage(data, xDays) {
    if (data.length <= xDays) {
        return null;
    }
    const latestPrice = getCurrentPrice(data);
    const priceXDaysAgo = data[data.length - 1 - xDays].price;
    const percentageIncrease = ((latestPrice - priceXDaysAgo) / priceXDaysAgo) * 100;
    return percentageIncrease;
}

getAllPagesHtml();
app.listen(PORT, () => console.log(`Listening on PORT ${PORT}`));
