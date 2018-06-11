var express = require('express');
var bodyParser = require('body-parser');
var i18n = require('../i18n');

var employee = require('./employee');
var company = require('./company');

var app = express();

app.set('views', __dirname + '/../views/');
app.set('view engine', 'ejs');
app.use(i18n);

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
    extended: true
}));

app.use('/employee', employee);
app.use('/company', company);

app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

app.use(function(err, req, res, next) {
  res.status(err.status || 500);
  res.render('error', {
    message: err.message,
    error: /*(app.get('env') === 'development') ? err : */{}
  });
});

module.exports = app;