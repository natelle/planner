var models  = require('../models');
var express = require('express');
var router  = express.Router();


router.get('/', function(req, res) {
    res.render('general/home.ejs');
});

module.exports = router;
