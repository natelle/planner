var models  = require('../models');
var express = require('express');
var router  = express.Router();

router.get('/', function(req, res) {
    models.Slot.findAll({
        attributes: ['categoryId'],
        group: ['Slot.categoryId']
    }).then(slots => {
        var promises = [];

        for(var slot of slots) {
            promises.push(models.EmployeeCategory.findById(slot.categoryId))
        }

        Promise.all(promises).then(categories => {
            res.render('agenda/home.ejs',
            {
                categories: categories
            });
        })
    })
});

router.get('/:categoryId(\\d+)', function(req, res) {
    var categoryId = req.params.categoryId;
    var year = (new Date()).getFullYear();

    res.redirect(categoryId + '/' + year);
});

router.get('/:categoryId(\\d+)/:year(\\d{4})', function(req, res) {
    var categoryId = req.params.categoryId;
    categoryId = categoryId !== '0' ? categoryId : null;
    var year = req.params.year;

    models.EmployeeCategory.findById(categoryId).then(category => {
        res.render('agenda/list-yearly.ejs',
        {
            category: category,
            year: year
        });
    });
});

router.get('/:categoryId(\\d+)/:month(\\d{2}):year(\\d{4})', function(req, res) {
    var categoryId = req.params.categoryId;
    categoryId = categoryId !== '0' ? categoryId : null;
    var month = req.params.month;
    var year = req.params.year;

    var firstDate = new Date(year, parseInt(month) - 1, 1);
    var lastDate = new Date(year, parseInt(month), 0);

    models.EmployeeCategory.findById(categoryId).then(category => {
        models.Slot.findAll({
            where: {
                categoryId: categoryId
            }
        }).then(rawSlots => {
            var slots = {}

            for(var slot of rawSlots) {
                for(var day of slot.days) {
                    if(typeof slots[day] === 'undefined') {
                        slots[day] = [slot];
                    } else {
                        slots[day].push(slot)
                    }
                }
            }

            res.render('agenda/list.ejs',
            {
                category: category,
                slots: slots,
                firstDate: firstDate,
                lastDate: lastDate
            });
        })
    });
});

router.get('/:categoryId(\\d+)/:month(\\d{2}):year(\\d{4})/default', function(req, res) {
    var categoryId = req.params.categoryId;
    categoryId = categoryId !== '0' ? categoryId : null;
    var month = req.params.month;
    var year = req.params.year;

    var firstDate = new Date(year, parseInt(month) - 1, 1);
    var lastDate = new Date(year, parseInt(month), 0);

    models.DefaultAgenda.findAll({
        include: [{
            model: models.Slot,
            where: { categoryId: categoryId },
            as: 'slot'
        }]
    }).then(rawAgendas => {
        var agendas = {}

        for(var agenda of rawAgendas) {
            var day = agenda.day;

            if(typeof agendas[day] === 'undefined') {
                agendas[day] = [agenda];
            } else {
                agendas[day].push(agenda)
            }
        }

        var promises = [];

        // Delete first all the availabilities in the month
        for(var d=new Date(firstDate); d<=lastDate; d.setDate(d.getDate() + 1)) {
            var date = d.getFullYear() + '-' + (d.getMonth()+1).toString().padStart(2, '0') + '-' + d.getDate().toString().padStart(2, '0') + ' 00:00:00Z';
            var day = (new Date(date)).getDay();

            promises.push(models.Agenda.destroy({
                where: {
                    day: date
                }, include: [{
                    model: models.Slot,
                    where: { categoryId: categoryId },
                    as: 'slot'
                }]
            }));
        }

        Promise.all(promises).then(values => {
            promises = [];

            // Create then all the agendas from the default ones
            for(var d=new Date(firstDate); d<=lastDate; d.setDate(d.getDate() + 1)) {
                var date = d.getFullYear() + '-' + (d.getMonth()+1).toString().padStart(2, '0') + '-' + d.getDate().toString().padStart(2, '0') + ' 00:00:00Z';
                var day = d.getDay();

                if(typeof agendas[day] !== 'undefined') {
                    for(var agenda of agendas[day]) {
                        promises.push(models.Agenda.create({
                            day: date,
                            slotId: agenda.slot.id
                        }));
                    }
                }
            }

            Promise.all(promises).then(values => {
                res.send(true);
            });
        });
    })
});

router.post('/enabled', function(req, res) {
    var date = req.body.dateId + " 00:00:00Z";
    var slotId = req.body.slotId;

    models.Agenda.findOne({
        where: {
            day: date,
            slotId: slotId
        }
    }).then(agenda => {
        res.send(agenda !== null);
    })
});

router.post('/number', function(req, res) {
    var date = req.body.dateId + " 00:00:00Z";
    var slotId = req.body.slotId;

    console.log("here " + date + " " + slotId);

    models.Agenda.findOne({
        where: {
            day: date,
            slotId: slotId
        }
    }).then(agenda => {
        console.log(agenda ? agenda.number : '0');
        res.send(agenda ? agenda.number.toString() : '0');
    })
});

router.post('/set', function(req, res) {
    var enable = req.body.enable == "true" ? true : false;
    var date = req.body.dateId + " 00:00:00Z";
    var slotId = req.body.slotId;

    if(enable) {
        models.Agenda.findOrCreate({
            where: {
                day: date,
                slotId: slotId,
            }, defaults: {
                day: date,
                slotId: slotId,
                number: 1
            }
        })
        .spread((availability, created) => {
            res.send(true)
        });
    } else {
        models.Agenda.destroy({ where: {
            day: date,
            slotId: slotId
        }}).then(status => {
            res.send(false)
        });
    }
});

router.get('/default', function(req, res) {
    models.Slot.findAll().then(rawSlots => {
        var slots = {}

        for(var slot of rawSlots) {
            var categoryId = slot.categoryId ? slot.categoryId : 0;

            if(typeof slots[categoryId] === 'undefined') {
                slots[categoryId] = {};
            }

            for(var day of slot.days) {
                if(typeof slots[categoryId][day] === 'undefined') {
                    slots[categoryId][day] = [slot];
                } else {
                    slots[categoryId][day].push(slot)
                }
            }
        }

        models.EmployeeCategory.findAll().then(rawCategories => {
            var categories = {};

            for(var category of rawCategories) {
                categories[category.id] = category;
            }

            res.render('agenda/default.ejs',
            {
                categories: categories,
                slots: slots
            });
        });
    });
});

router.post('/default/enabled', function(req, res) {
    var day = req.body.day;
    var slotId = req.body.slotId;

    models.DefaultAgenda.findOne({
        where: {
            day: day,
            slotId: slotId
        }
    }).then(agenda => {
        res.send(agenda !== null);
    })
});

router.post('/default/set', function(req, res) {
    var enable = req.body.enable == "true" ? true : false;
    var day = req.body.day;
    var slotId = req.body.slotId;

    if(enable) {
        models.DefaultAgenda.findOrCreate({
            where: {
                day: day,
                slotId: slotId
            }, defaults: {
                day: day,
                slotId: slotId
            }
        })
        .spread((agenda, created) => {
            res.send(true)
        });
    } else {
        models.DefaultAgenda.destroy({ where: {
            day: day,
            slotId: slotId
        }}).then(status => {
            res.send(false)
        });
    }
});


module.exports = router;
