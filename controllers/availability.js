var models = require('../models');
var express = require('express');
var router = express.Router();

router.get('/:id(\\d+)/availabilities', function (req, res) {
    var id = req.params.id;
    var year = (new Date()).getFullYear();

    res.redirect('/employee/' + id + '/availabilities/' + year);
});

router.get('/:id(\\d+)/availabilities/:year(\\d{4})', function (req, res) {
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

router.get('/:id(\\d+)/availabilities/:month(\\d{2}):year(\\d{4})', function (req, res) {
    var id = req.params.id;
    var month = req.params.month;
    var year = req.params.year;

    var firstDate = new Date(Date.UTC(year, parseInt(month) - 1, 1));
    var lastDate = new Date(Date.UTC(year, parseInt(month), 0));

    models.Employee.findById(id, {
        include: [{
            model: models.EmployeeCategory,
            as: 'category'
        }]
    }).then(employee => {
        models.Slot.findAll({
            where: {
                categoryId: employee.category.id
            },
            order: ['begin']
        }).then(rawSlots => {
            var promises = [];

            if (rawSlots.length == 0) {
                promises.push(models.Slot.findAll({
                    where: {
                        categoryId: null
                    },
                    order: ['begin']
                }).then(defaultSlots => {
                    rawSlots = defaultSlots;
                }))
            }

            Promise.all(promises).then(values => {
                var slots = {}

                for (var slot of rawSlots) {
                    for (var day of slot.days) {
                        if (typeof slots[day] === 'undefined') {
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

router.get('/:id(\\d+)/availabilities/:month(\\d{2}):year(\\d{4})/default', function (req, res) {
    var id = req.params.id;
    var month = req.params.month;
    var year = req.params.year;

    var firstDate = new Date(Date.UTC(year, parseInt(month) - 1, 1));
    var lastDate = new Date(Date.UTC(year, parseInt(month), 0));

    models.Employee.findById(id).then(employee => {
        models.DefaultAvailability.findAll({
            where: {
                EmployeeId: id
            }, include: [{
                model: models.Slot,
                as: 'slot'
            }],
            order: [
                [{ model: models.Slot, as: 'slot' }, 'begin', 'ASC']
            ]
        }).then(rawAvailabilities => {
            var availabilities = {}

            for (var availability of rawAvailabilities) {
                var day = availability.day;

                if (typeof availabilities[day] === 'undefined') {
                    availabilities[day] = [availability];
                } else {
                    availabilities[day].push(availability)
                }
            }

            var promises = [];

            // Delete first all the availabilities in the month
            for (var d = new Date(firstDate); d <= lastDate; d.setDate(d.getDate() + 1)) {
                // var date = d.getFullYear() + '-' + (d.getMonth()+1).toString().padStart(2, '0') + '-' + d.getDate().toString().padStart(2, '0') + ' 00:00:00Z';
                let date = new Date(d);
                var day = (new Date(d)).getDay();

                promises.push(models.Availability.destroy({
                    where: {
                        EmployeeId: id,
                        day: date,
                        planningId: null
                    }
                }));
            }

            Promise.all(promises).then(values => {
                promises = [];

                // Create then all the availabilities from the default ones
                for (var d = new Date(firstDate); d <= lastDate; d.setDate(d.getDate() + 1)) {
                    let date = new Date(d);
                    let day = date.getDay();

                    if (typeof availabilities[day] !== 'undefined') {
                        for (var availability of availabilities[day]) {
                            promises.push(models.Availability.create({
                                EmployeeId: id,
                                day: date,
                                slotId: availability.slot.id,
                                mandatory: availability.mandatory
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

router.post('/:id(\\d+)/availabilities/state', function (req, res) {
    var employeeId = req.params.id;
    var date = new Date(parseInt(req.body.dateId));
    var slotId = req.body.slotId;

    models.Availability.findOne({
        where: {
            EmployeeId: employeeId,
            day: date,
            slotId: slotId,
            planningId: null
        }
    }).then(availability => {
        var state;

        if(!availability) {
            state = "disabled";
        } else if(availability.mandatory) {
            state = "mandatory";
        } else {
            state = "enabled";
        }

        res.send(state);
    })
});

router.post('/:id(\\d+)/availabilities/set', function (req, res) {
    var employeeId = req.params.id;
    var state = req.body.state;
    var date = new Date(parseInt(req.body.dateId));
    var slotId = req.body.slotId;

    if (state === "enabled") {
        models.Availability.findOrCreate({
            where: {
                EmployeeId: employeeId,
                day: date,
                slotId: slotId,
                planningId: null
            }, defaults: {
                EmployeeId: employeeId,
                day: date,
                slotId: slotId,
                mandatory: false,
                planningId: null
            }
        }).spread((availability, created) => {
            if (!created) {
                models.Availability.update(
                    {
                        mandatory: false,
                    },
                    { where:
                        { id: availability.id }
                    }
                ).then(availability => {
                    res.send("enabled");
                });
            } else {
                res.send("enabled");
            }
        });
    } else if (state === "disabled") {
        models.Availability.destroy({
            where: {
                EmployeeId: employeeId,
                day: date,
                slotId: slotId,
                planningId: null
            }
        }).then(status => {
            res.send("disabled")
        });
    } else if (state === "mandatory") {
        models.Availability.findOrCreate({
            where: {
                EmployeeId: employeeId,
                day: date,
                slotId: slotId,
                planningId: null
            }, defaults: {
                EmployeeId: employeeId,
                day: date,
                slotId: slotId,
                mandatory: true,
                planningId: null
            }
        }).spread((availability, created) => {
            if (!created) {
                models.Availability.update(
                    {
                        mandatory: true,
                    },
                    { where:
                        { id: availability.id }
                    }
                ).then(availability => {
                    res.send("mandatory");
                });
            } else {
                res.send("mandatory");
            }
        });
    }
});

router.get('/:id(\\d+)/availabilities/default', function (req, res) {
    var id = req.params.id;

    models.Employee.findById(id, {
        include: [{
            model: models.EmployeeCategory,
            as: 'category'
        }]
    }).then(employee => {
        models.Slot.findAll({
            where: {
                categoryId: employee.category.id
            },
            order: ['begin']
        }).then(rawSlots => {
            var promises = [];

            if (rawSlots.length == 0) {
                promises.push(models.Slot.findAll({
                    where: {
                        categoryId: null
                    },
                    order: ['begin']
                }).then(defaultSlots => {
                    rawSlots = defaultSlots;
                }))
            }

            Promise.all(promises).then(values => {
                var slots = {}

                for (var slot of rawSlots) {
                    for (var day of slot.days) {
                        if (typeof slots[day] === 'undefined') {
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

router.post('/:id(\\d+)/availabilities/default/state', function (req, res) {
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
        var state;

        if (!availability) {
            state = "disabled";
        } else if (availability.mandatory) {
            state = "mandatory";
        } else {
            state = "enabled";
        }

        res.send(state);
    })
});

router.post('/:id(\\d+)/availabilities/default/set', function (req, res) {
    var employeeId = req.params.id;
    var state = req.body.state;
    var day = req.body.day;
    var slotId = req.body.slotId;

    if (state === "enabled") {
        models.DefaultAvailability.findOrCreate({
            where: {
                EmployeeId: employeeId,
                day: day,
                slotId: slotId,
            }, defaults: {
                EmployeeId: employeeId,
                day: day,
                slotId: slotId,
                mandatory: false
            }
        }).spread((availability, created) => {
            if (!created) {
                models.DefaultAvailability.update(
                    {
                        mandatory: false,
                    },
                    { where:
                        { id: availability.id }
                    }
                ).then(availability => {
                    res.send("enabled");
                });
            } else {
                res.send("enabled");
            }
        });
    } else if (state === "disabled") {
        models.DefaultAvailability.destroy({
            where: {
                EmployeeId: employeeId,
                day: day,
                slotId: slotId
            }
        }).then(status => {
            res.send("disabled")
        });
    } else if (state === "mandatory") {
        models.DefaultAvailability.findOrCreate({
            where: {
                EmployeeId: employeeId,
                day: day,
                slotId: slotId
            }, defaults: {
                EmployeeId: employeeId,
                day: day,
                slotId: slotId,
                mandatory: true
            }
        }).spread((availability, created) => {
            if (!created) {
                models.DefaultAvailability.update(
                    {
                        mandatory: true,
                    },
                    {
                        where: { id: availability.id }
                    }
                ).then(availability => {
                    res.send("mandatory");
                });
            } else {
                res.send("mandatory");
            }
        });
    }
});

router.get('/availabilities/category/:categoryId(\\d+)/slot/:slotId(\\d+)/:dateId(\\d{12,})', function (req, res) {
    var categoryId = req.params.categoryId;
    categoryId = categoryId !== '0' ? categoryId : null;
    var slotId = req.params.slotId;
    var date = new Date(parseInt(req.params.dateId));

    // TODO if categoryId == null, not filter

    models.Availability.findAll({
        include: [{
            model: models.Employee,
            where: categoryId ? { categoryId: categoryId } : {}
        }],
        where: {
            day: date,
            slotId: slotId,
            planningId: null
        },
        order: [
            [models.Employee, 'lastName', 'ASC'],
            [models.Employee, 'firstName', 'ASC']
        ]
    }).then(availabilities => {
        res.send(availabilities);
    });
});

module.exports = router;
