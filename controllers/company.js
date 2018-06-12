var models  = require('../models');
var express = require('express');
var router  = express.Router();

router.get('/', function(req, res) {
    models.Company.findOrCreate({
        where: {},
        defaults: {
            name: "",
            email: "",
            phone: ""
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
        phone: req.body.phone
    }, {where: { id: req.body.id }}).then(company => {
        res.redirect('/company');
    });
});

module.exports = router;
