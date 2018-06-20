var models  = require('../models');
var express = require('express');
var router  = express.Router();

router.get('/', function(req, res) {
    models.CompanyOptions.findOrCreate({
        where: {},
        defaults: {
            name: ""
        },
        include: [{
            model: models.CompanyOptionsDay,
            as: 'days'
        }]
    }).spread(function(companyOptions, created) {
        res.render('companyoptions/show.ejs', {
            options: companyOptions,
            categories: c,
            slotTypes: slotTypes
        });
    });
});

module.exports = router;
