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
        models.EmployeeCategory.findAll().then(categories => {
            var promises = [];

            promises.push(models.CompanyOptionsDay.findAll({
                where: {employeecategoryid: null}
            }));

            for(var i in categories) {
                var category = categories[i];

                promises.push(models.CompanyOptionsDay.findAll({
                    where: {employeecategoryid: category.id}
                }));
            }

            Promise.all(promises).then(values => {
                promises = [];

                for(var i in values) {
                    if(values[i].length == 0) {
                        for(var j=0; j<7; j++) {
                            var id = (i==0 ? null : categories[i-1].id)

                            promises.push(models.CompanyOptionsDay.create({
                                number: j,
                                companyoptionsid: companyOptions.id,
                                employeecategoryid: id
                            }))
                        }
                    }
                }

                Promise.all(promises).then(rawDays => {
                    if(!created) {
                        rawDays = companyOptions.days;
                    } else {
                        companyOptions.setDays(rawDays);
                    }

                    rawDays.sort(function(d1, d2) {
                        return d1.number - d2.number;
                    });

                    while(rawDays[0].number == 0) {
                        var day = rawDays.shift();
                        rawDays.push(day);
                    }

                    var days = {};
                    for(var i in rawDays) {
                        var id = rawDays[i].employeecategoryid ? rawDays[i].employeecategoryid : 'default';
                        if(typeof days[id] === 'undefined') {
                            days[id] = [rawDays[i]];
                        } else {
                            days[id].push(rawDays[i])
                        }
                    }


                    companyOptions.days = days;
                    res.render('companyoptions/show.ejs', {options: companyOptions});
                });
            });
        });
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
