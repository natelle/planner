var express = require('express');
var app = express();

var bodyParser = require('body-parser')
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
    extended: true
}));

const db = require('./models/models.js')();
const router = require('./controllers/controllers.js')(express, db);
app.use("/", router);

app.listen(8080);

console.log("main running...");
