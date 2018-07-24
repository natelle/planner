var models  = require('../models');
var express = require('express');
var fs = require('fs');
var router  = express.Router();



router.get('/', function(req, res) {
    res.render('general/home.ejs');
});

router.get('/settings', function(req, res) {
    var settings = req.settings;

    res.render('general/settings.ejs', {
        settings: settings
    });
});

router.post('/settings', function(req, res) {
    req.settings.planning.generation.pass = req.body["planning.generation.pass"];
    req.settings.planning.generation.time = parseInt(parseFloat(req.body["planning.generation.time"])*1000);

    var json = JSON.stringify(req.settings); 
    fs.writeFile('config/planner.json', json);

    res.redirect('/settings');
});

module.exports = router;
