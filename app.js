const PORT = 8000
const express = require('express');
const cors = require('cors');
const path = require('path');
const https = require('https');
const { stringify } = require('querystring');
const app = express();
const PAGE_NUM = 5;

app.use(cors());
app.use(express.urlencoded({ extended: true }));
const static_path = path.join(__dirname, "public");
app.use(express.static(static_path));

var buff_BaseUrl = "https://buff.163.com/api/market/";
var buff_Url = generate_buff_url_list()[0];

const config = {
    headers: {
        "accept": "application/json, text/javascript, */*; q=0.01",
        "cookie": "Device-Id=FQdmczfLtMcb0gXxJ4SN; \
            P_INFO=1-2163402181|1680556732|1|netease_buff|00&99|null&null&null#US&null#10#0|&0|null|1-2163402181; \
            remember_me=U1101345113|sS5uhh1nsNAE0HGfR69dAcbYkO9iNlq1; session=1-Yeuv4eZ9gQh1GI1jIiP1gkV67T6VzffVNx77JrIC52oQ2037100033; \
            csrf_token=ImJjMjE2MzBmNjJkOWQyNzZiYTdmYzQ3NTZhY2MwY2MzMmJlYWZiN2Yi.FxnUhw.CG5jMc47bFKHRv6fHdHdnBh88Nw; Locale-Supported=en; game=csgo",
        "referer": "https://buff.163.com/market/csgo",
        "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:109.0) Gecko/20100101 Firefox/111.0"
    }
}

app.get('/buff_summary', async (req, res) => {
    data = await get_all_buff_page_data();
    res.send(data);
});

function renameKey(obj, oldKey, newKey) {
    obj[newKey] = obj[oldKey];
    delete obj[oldKey];
}

function generate_buff_url_list() {
    var url_list = []
    for (var i = 1; i <= PAGE_NUM; i++) {
        url_list.push(buff_BaseUrl + "goods?game=csgo&page_num=" + i + "&sort_by=price.desc&use_suggestion=0&use_suggestion=0&_=1681420797208&page_size=80")
    }
    return url_list
}

async function get_all_buff_page_data() {
    var all_buff_data = await get_buff_json_data(buff_Url);
    var index = 1;
    while (index < PAGE_NUM) {
        var current_page_data = await get_buff_json_data(generate_buff_url_list()[index]);
        await new Promise(r => setTimeout(r, 1000));
        for (i = 0; i < 80; i++) {
            renameKey(current_page_data['data']['items'], i, i + index * 80);
        }
        all_buff_data['data']['items'] = {
            ...all_buff_data['data']['items'],
            ...current_page_data['data']['items']
        }
        index += 1;
    }
    var name = get_required_data(all_buff_data['data']['items'], 'name');
    var buff_price = get_required_data(all_buff_data['data']['items'], 'sell_min_price');
    var steam_market_url = get_required_data(all_buff_data['data']['items'], 'steam_market_url');
    var icon_url = get_icon_url(all_buff_data['data']['items']);
    return create_json_from_data(name, buff_price, icon_url, steam_market_url);
}

function create_json_from_data(name, buff_price, icon_url, steam_market_url) {
    var json_data = [];
    for (i = 0; i < PAGE_NUM * 80; i++) {
        json_data.push({
            "name": name[i],
            "buff_price": buff_price[i],
            "icon_url": icon_url[i],
            "steam_market_url": steam_market_url[i]
        });
    }
    return json_data;
}

function get_icon_url(data) {
    var icon_url = [];
    for (i = 0; i < PAGE_NUM * 80; i++) {
        icon_url.push(data[i]['goods_info']['icon_url']);
    }
    return icon_url;
}

function get_required_data(data, key) {
    var required_data = [];
    for (i = 0; i < PAGE_NUM * 80; i++) {
        required_data.push(data[i][key]);
    }
    return required_data;
}

function get_buff_json_data(url) {
    console.log(url);
    return new Promise(function (resolve, reject) {
        let data = '';
        https.get(url, config, (res) => {
            res.on('data', (chunk) => {
                data += chunk;
            });
            res.on('end', () => {
                resolve(JSON.parse(data));
            });
        }).on("error", (err) => {
            reject("Error: " + err.message);
        });
    });
}

app.listen(PORT, () => console.log(`Listening on PORT ${PORT}`));
