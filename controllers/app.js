var express = require('express');
var bodyParser = require('body-parser');
var i18n = require('../i18n');

var general = require('./general');
var employee = require('./employee');
var category = require('./category');
var company = require('./company');
var companyOptions = require('./companyoptions');
var agenda = require('./agenda');
var planning = require('./planning');
var slot = require('./slot');
var availability = require('./availability');

var app = express();

app.set('views', __dirname + '/../views/');
app.set('view engine', 'ejs');
app.use(express.static(__dirname + '/../public'));
app.use(i18n);

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
    extended: true
}));

app.use(function (req, res, next) {
  req.settings = require('../config/planner.json');
    
  next();
});


app.use('/', general);
app.use('/employee', employee);
app.use('/employee/category', category);
app.use('/company', company);
app.use('/company/options', companyOptions);
app.use('/company/slot', slot);
app.use('/agenda', agenda);
app.use('/planning', planning);
app.use('/employee', availability);

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
