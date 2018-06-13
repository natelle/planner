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
            "defaultNumber": 1,
            "defaultDay0": "time.closed",
            "defaultDay1": "time.allday",
            "defaultDay2": "time.allday",
            "defaultDay3": "time.allday",
            "defaultDay4": "time.allday",
            "defaultDay5": "time.allday",
            "defaultDay6": "time.allday"
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
        "defaultNumber": req.body.defaultNumber,
        "defaultDay1": req.body.defaultDay1,
        "defaultDay2": req.body.defaultDay2,
        "defaultDay3": req.body.defaultDay3,
        "defaultDay4": req.body.defaultDay4,
        "defaultDay5": req.body.defaultDay5,
        "defaultDay6": req.body.defaultDay6,
        "defaultDay0": req.body.defaultDay0,
    }, {where: { id: req.body.id }}).then(company => {
        res.redirect('/company');
    });
});

module.exports = router;
