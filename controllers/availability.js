var models  = require('../models');
var express = require('express');
var router  = express.Router();

router.get('/:id(\\d+)/availabilities', function(req, res) {
    var id = req.params.id;
    var year = (new Date()).getFullYear();

    res.redirect('/employee/' + id + '/availabilities/' + year);
});

router.get('/:id(\\d+)/availabilities/:year(\\d{4})', function(req, res) {
    var id = req.params.id;
    var year = req.params.year;

    models.Employee.findById(id).then(employee => {
        res.render('availability/list-yearly.ejs',
        {
            employee: employee,
            year: year
        });
    });
});

router.get('/:id(\\d+)/availabilities/:month(\\d{2}):year(\\d{4})', function(req, res) {
    var id = req.params.id;
    var month = req.params.month;
    var year = req.params.year;

    var firstDate = new Date(year, parseInt(month) - 1, 1);
    var lastDate = new Date(year, parseInt(month), 0);

    var firstDateFormated = firstDate.getFullYear() + '-' + (firstDate.getMonth()+1).toString().padStart(2, '0') + '-' + firstDate.getDate().toString().padStart(2, '0') + ' 00:00:00Z';
    var lastDateFormated = lastDate.getFullYear() + '-' + (lastDate.getMonth()+1).toString().padStart(2, '0') + '-' + lastDate.getDate().toString().padStart(2, '0') + ' 00:00:00Z';

    models.Employee.findById(id, {include: [{
        model: models.EmployeeCategory,
        as: 'category'
    }]}).then(employee => {
        models.Slot.findAll({
            where: {
                categoryId: employee.category.id
            }
        }).then(rawSlots => {
            var promises = [];

            if(rawSlots.length == 0) {
                promises.push(models.Slot.findAll({
                    where: {
                        categoryId: null
                    }
                }).then(defaultSlots => {
                    rawSlots = defaultSlots;
                }))
            }

            Promise.all(promises).then(values => {
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

                res.render('availability/list.ejs',
                {
                    employee: employee,
                    slots: slots,
                    firstDate: firstDate,
                    lastDate: lastDate
                });
            });
        })
    });
});

router.get('/:id(\\d+)/availabilities/:month(\\d{2}):year(\\d{4})/default', function(req, res) {
    var id = req.params.id;
    var month = req.params.month;
    var year = req.params.year;

    var firstDate = new Date(year, parseInt(month) - 1, 1);
    var lastDate = new Date(year, parseInt(month), 0);

    models.Employee.findById(id).then(employee => {
        models.DefaultAvailability.findAll({
            where: {
                EmployeeId: id
            }, include: [{
                model: models.Slot,
                as: 'slot'
            }]
        }).then(rawAvailabilities => {
            var availabilities = {}

            for(var availability of rawAvailabilities) {
                var day = availability.day;

                if(typeof availabilities[day] === 'undefined') {
                    availabilities[day] = [availability];
                } else {
                    availabilities[day].push(availability)
                }
            }

            var promises = [];

            // Delete first all the availabilities in the month
            for(var d=new Date(firstDate); d<=lastDate; d.setDate(d.getDate() + 1)) {
                var date = d.getFullYear() + '-' + (d.getMonth()+1).toString().padStart(2, '0') + '-' + d.getDate().toString().padStart(2, '0') + ' 00:00:00Z';
                var day = (new Date(date)).getDay();

                promises.push(models.Availability.destroy({ where: {
                    EmployeeId: id,
                    day: date
                }}));
            }

            Promise.all(promises).then(values => {
                promises = [];

                // Create then all the availabilities from the default ones
                for(var d=new Date(firstDate); d<=lastDate; d.setDate(d.getDate() + 1)) {
                    var date = d.getFullYear() + '-' + (d.getMonth()+1).toString().padStart(2, '0') + '-' + d.getDate().toString().padStart(2, '0') + ' 00:00:00Z';
                    var day = d.getDay();

                    if(typeof availabilities[day] !== 'undefined') {
                        for(var availability of availabilities[day]) {
                            promises.push(models.Availability.create({
                                EmployeeId: id,
                                day: date,
                                slotId: availability.slot.id
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
});

router.post('/:id(\\d+)/availabilities/enabled', function(req, res) {
    var employeeId = req.params.id;
    var date = req.body.dateId + " 00:00:00Z";
    var slotId = req.body.slotId;

    models.Availability.findOne({
        where: {
            EmployeeId: employeeId,
            day: date,
            slotId: slotId
        }
    }).then(availability => {
        res.send(availability !== null);
    })
});

router.post('/:id(\\d+)/availabilities/set', function(req, res) {
    var employeeId = req.params.id;
    var enable = req.body.enable == "true" ? true : false;
    var date = req.body.dateId + " 00:00:00Z";
    var slotId = req.body.slotId;

    if(enable) {
        models.Availability.findOrCreate({
            where: {
                EmployeeId: employeeId,
                day: date,
                slotId: slotId
            }, defaults: {
                EmployeeId: employeeId,
                day: date,
                slotId: slotId
            }
        })
        .spread((availability, created) => {
            res.send(true)
        });
    } else {
        models.Availability.destroy({ where: {
            EmployeeId: employeeId,
            day: date,
            slotId: slotId
        }}).then(status => {
            res.send(false)
        });
    }
});

router.get('/:id(\\d+)/availabilities/default', function(req, res) {
    var id = req.params.id;
    models.Employee.findById(id, {include: [{
        model: models.EmployeeCategory,
        as: 'category'
    }]}).then(employee => {
        models.Slot.findAll({
            where: {
                categoryId: employee.category.id
            }
        }).then(rawSlots => {
            var promises = [];

            if(rawSlots.length == 0) {
                promises.push(models.Slot.findAll({
                    where: {
                        categoryId: null
                    }
                }).then(defaultSlots => {
                    rawSlots = defaultSlots;
                }))
            }

            Promise.all(promises).then(values => {
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

                res.render('availability/default.ejs',
                {
                    employee: employee,
                    slots: slots
                });
            });
        })
    });
});

router.post('/:id(\\d+)/availabilities/default/enabled', function(req, res) {
    var employeeId = req.params.id;
    var day = req.body.day;
    var slotId = req.body.slotId;

    models.DefaultAvailability.findOne({
        where: {
            EmployeeId: employeeId,
            day: day,
            slotId: slotId
        }
    }).then(availability => {
        res.send(availability !== null);
    })
});

router.post('/:id(\\d+)/availabilities/default/set', function(req, res) {
    var employeeId = req.params.id;
    var enable = req.body.enable == "true" ? true : false;
    var day = req.body.day;
    var slotId = req.body.slotId;

    if(enable) {
        models.DefaultAvailability.findOrCreate({
            where: {
                EmployeeId: employeeId,
                day: day,
                slotId: slotId
            }, defaults: {
                EmployeeId: employeeId,
                day: day,
                slotId: slotId
            }
        })
        .spread((availability, created) => {
            res.send(true)
        });
    } else {
        models.DefaultAvailability.destroy({ where: {
            EmployeeId: employeeId,
            day: day,
            slotId: slotId
        }}).then(status => {
            res.send(false)
        });
    }
});

router.get('/:id(\\d+)/availabilities/:month(\\d{2}):year(\\d{4})/reset', function(req, res) {
    var id = req.params.id;
    var month = req.params.month;
    var year = req.params.year;

    var firstDate = new Date(year, parseInt(month) - 1, 1);
    var lastDate = new Date(year, parseInt(month), 0);

    var firstDateFormated = firstDate.getFullYear() + '-' + (firstDate.getMonth()+1).toString().padStart(2, '0') + '-' + firstDate.getDate().toString().padStart(2, '0') + ' 00:00:00Z';
    var lastDateFormated = lastDate.getFullYear() + '-' + (lastDate.getMonth()+1).toString().padStart(2, '0') + '-' + lastDate.getDate().toString().padStart(2, '0') + ' 00:00:00Z';

    var promises = [];

    for(var d=firstDate; d<=lastDate; d.setDate(d.getDate() + 1)) {
        var date = d.getFullYear() + '-' + (d.getMonth()+1).toString().padStart(2, '0') + '-' + d.getDate().toString().padStart(2, '0') + ' 00:00:00Z';

        promises.push(models.Availability.destroy({
            where: { Employeeid: req.params.id, day: date }
        }));
    }

    Promise.all(promises).then(values => {
        res.redirect('/employee/' + id + '/availabilities/' + month + year);
    });
});

router.post('/:id(\\d+)/availabilities/type/set', function(req, res) {
    var date = req.body.dateId + " 00:00:00Z";

    models.Availability.update({
        type: req.body.value
    },
    {where: { Employeeid: req.params.id, day: date }}).then(employee => {
        res.send("maj!")
    });
});

module.exports = router;
