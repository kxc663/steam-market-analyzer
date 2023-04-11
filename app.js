const PORT = 8000
const express = require('express');
const cors = require('cors');
const path = require('path');
const app = express();
app.use(cors());
app.use(express.urlencoded({ extended: true }));
const static_path = path.join(__dirname, "public");
app.use(express.static(static_path));


app.listen(PORT, () => console.log(`Listening on PORT ${PORT}`));
