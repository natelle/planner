var models  = require('../models');
var express = require('express');
var router  = express.Router();

router.get('/', function(req, res) {
    models.Company.findOrCreate({
        where: {},
        defaults: {
            name: "",
            email: "",
            phone: "",
            defaultMon: "time.allday",
            defaultTue: "time.allday",
            defaultWed: "time.allday",
            defaultThu: "time.allday",
            defaultFri: "time.allday",
            defaultSat: "time.allday",
            defaultSun: "time.closed"
        }}
    ).spread(function(company, created){
        res.render('company/show.ejs', {company: company});
    });
});

router.get('/update', function(req, res) {
    models.Company.findOne({where: {}}).then(company => {
        res.render('company/update.ejs', {company: company});
    });
});

router.post('/update', function(req, res) {
    models.Company.update({
        name: req.body.name,
        email: req.body.email,
        phone: req.body.phone,
        defaultMon: req.body.defaultMon,
        defaultTue: req.body.defaultTue,
        defaultWed: req.body.defaultWed,
        defaultThu: req.body.defaultThu,
        defaultFri: req.body.defaultFri,
        defaultSat: req.body.defaultSat,
        defaultSun: req.body.defaultSun,
    }, {where: { id: req.body.id }}).then(company => {
        res.redirect('/company');
    });
});

module.exports = router;
