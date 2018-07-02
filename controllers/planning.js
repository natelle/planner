var models = require('../models');
var express = require('express');
var i18n = require('i18n');

const Planner = require('../bin/planner/planner.js');
var router = express.Router();

router.get('/', function (req, res) {
    models.Slot.findAll({
        attributes: ['categoryId'],
        group: ['Slot.categoryId'],
        order: ['begin']
    }).then(slots => {
        var promises = [];

        for (var slot of slots) {
            promises.push(models.EmployeeCategory.findById(slot.categoryId))
        }

        Promise.all(promises).then(categories => {
            res.render('planning/home.ejs',
                {
                    categories: categories
                });
        })
    });
});

router.get('/category/:categoryId(\\d+)', function (req, res) {
    var categoryId = req.params.categoryId;
    var year = (new Date()).getFullYear();

    res.redirect("/planning/category/" + categoryId + '/' + year);
});

router.get('/category/:categoryId(\\d+)/:year(\\d{4})', function (req, res) {
    var categoryId = req.params.categoryId;
    categoryId = categoryId !== '0' ? categoryId : null;
    var year = req.params.year;

    models.EmployeeCategory.findById(categoryId).then(category => {
        models.Planning.findAll({
            where: {
                firstDate: {
                    [models.Sequelize.Op.between]: [new Date(year, 0, 1), new Date(year, 11, 31)]
                },
                categoryId: categoryId
            }
        }).then(rawPlannings => {
            var plannings = {};

            for (var planning of rawPlannings) {
                var month = planning.firstDate.getMonth();

                if (typeof plannings[month] === 'undefined') {
                    plannings[month] = [planning];
                } else {
                    plannings[month].push(planning);
                }
            }

            res.render('planning/list-yearly.ejs',
                {
                    plannings: plannings,
                    category: category,
                    year: year
                });
        });
    });
});

router.get('/generate/category/:categoryId(\\d+)/:month(\\d{2}):year(\\d{4})', function (req, res) {
    var categoryId = req.params.categoryId;
    categoryId = categoryId !== '0' ? categoryId : null;
    var month = req.params.month;
    var year = req.params.year;

    var firstDate = new Date(Date.UTC(year, parseInt(month) - 1, 1));
    var lastDate = new Date(Date.UTC(year, parseInt(month), 0));

    var promises = [];
    var employees, agendas, availabilities, slots;

    promises.push(models.Agenda.findAll({
        where: {
            day: {
                [models.Sequelize.Op.between]: [firstDate, lastDate]
            }
        },
        include: [{
            model: models.Slot,
            where: { categoryId: categoryId },
            as: 'slot'
        }]
    }).then(a => {
        agendas = a;
    }));

    promises.push(models.Availability.findAll({
        where: {
            day: {
                [models.Sequelize.Op.between]: [firstDate, lastDate]
            }
        },
        include: [{
            model: models.Slot,
            where: { categoryId: categoryId },
            as: 'slot'
        }]
    }).then(a => {
        availabilities = a;
    }));

    promises.push(models.Slot.findAll({
        where: {
            categoryId: categoryId
        }
    }).then(s => {
        slots = s;
    }));

    promises.push(models.Employee.findAll({
        include: [{
            model: models.EmployeeCategory,
            where: { id: categoryId },
            as: 'category'
        }]
    }).then(e => {
        employees = e;
    }));

    Promise.all(promises).then(values => {
        var planner = new Planner({
            firstDate: firstDate,
            lastDate: lastDate,
            employees: employees,
            slots: slots,
            agendas: agendas,
            availabilities: availabilities
        });

        var generatedPlanning = planner.generate();

        if (generatedPlanning) {
            models.Planning.create({
                firstDate: firstDate,
                lastDate: lastDate,
                validated: false,
                presences: generatedPlanning.presences,
                categoryId: categoryId
            }, {
                    include: [{
                        model: models.Availability,
                        as: 'presences'
                    }]
                }).then(planning => {
                    res.redirect('/planning/' + planning.id);
                });
        } else {
            res.render('planning/failure.ejs');
        }
    });
});

router.get('/create/category/:categoryId(\\d+)/:month(\\d{2}):year(\\d{4})', function (req, res) {
    var categoryId = req.params.categoryId;
    categoryId = categoryId !== '0' ? categoryId : null;
    var month = req.params.month;
    var year = req.params.year;

    var firstDate = new Date(Date.UTC(year, parseInt(month) - 1, 1));
    var lastDate = new Date(Date.UTC(year, parseInt(month), 0));

    models.Agenda.findAll({
        where: {
            day: {
                [models.Sequelize.Op.between]: [firstDate, lastDate]
            }
        },
        include: [
            {
                model: models.Slot,
                as: 'slot',
                where: {
                    categoryId: categoryId
                }
            }
        ]
    }).then(rawAgendas => {
        var agendas = {};

        for (var agenda of rawAgendas) {
            var day = agenda.day.getTime();

            if (typeof agendas[day] === "undefined") {
                agendas[day] = {};
            }

            var slotId = agenda.slot.id;

            if (typeof agendas[day][slotId] === "undefined") {
                agendas[day][slotId] = [agenda];
            } else {
                agendas[day][slotId].push(agenda);
            }
        }

        for (var d = new Date(firstDate); d <= lastDate; d.setDate(d.getDate() + 1)) {
            if (typeof agendas[d.getTime()] === 'undefined') {
                agendas[d.getTime()] = {};
            }
        }        

        models.Planning.create({
            firstDate: firstDate,
            lastDate: lastDate,
            validated: false,
            presences: [],
            categoryId: categoryId
        }).then(planning => {
            console.log("planning id = " + planning.id);
            
            res.redirect("/planning/create/" + planning.id);
        });
    });
});

router.get('/create/:id(\\d+)', function (req, res) {
    models.Planning.findById(req.params.id).then(planning => {
        var promises = [];

        promises.push(models.Slot.findAll({
            where: {
                categoryId: planning.getCategoryId()
            },
            order: ['begin']
        }));
        
        promises.push(models.Agenda.findAll({
            where: {
                day: {
                    [models.Sequelize.Op.between]: [planning.firstDate, planning.lastDate]
                }
            },
            include: [
                {
                    model: models.Slot,
                    as: 'slot',
                    where: {
                        categoryId: planning.getCategoryId()
                    }
                }
            ]
        }));
        
        Promise.all(promises).then(values => {
            var agendas = {};
    
            for (var agenda of values[1]) {
                var day = agenda.day.getTime();
    
                if (typeof agendas[day] === "undefined") {
                    agendas[day] = {};
                }
    
                var slotId = agenda.slot.id;
    
                if (typeof agendas[day][slotId] === "undefined") {
                    agendas[day][slotId] = [agenda];
                } else {
                    agendas[day][slotId].push(agenda);
                }
            }
    
            for (var d = new Date(planning.firstDate); d <= planning.lastDate; d.setDate(d.getDate() + 1)) {
                if (typeof agendas[d.getTime()] === 'undefined') {
                    agendas[d.getTime()] = {};
                }
            }

            res.render('planning/create.ejs', {
                agendas: agendas,
                planning: planning,
                slots: values[0]
            });
        });
    });
});

router.get("/category/:categoryId(\\d+)/:month(\\d{2}):year(\\d{4})", function (req, res) {
    var categoryId = req.params.categoryId;
    categoryId = categoryId !== '0' ? categoryId : null;
    var month = req.params.month;
    var year = req.params.year;

    var firstDate = new Date(Date.UTC(year, parseInt(month) - 1, 1));
    var lastDate = new Date(Date.UTC(year, parseInt(month), 0));

    models.Planning.findAll({
        where: {
            firstDate: firstDate,
            lastDate: lastDate,
            categoryId: categoryId,
        },
        order: [
            ['validated', 'DESC'],
            ['createdAt', 'ASC']
        ]
    }).then(plannings => {
        res.render('planning/list.ejs', {
            plannings: plannings
        });
    })
});

router.get("/category/:categoryId(\\d+)/:month(\\d{2}):year(\\d{4})/validated", function (req, res) {
    var categoryId = req.params.categoryId;
    categoryId = categoryId !== '0' ? categoryId : null;
    var month = req.params.month;
    var year = req.params.year;

    var firstDate = new Date(Date.UTC(year, parseInt(month) - 1, 1));
    var lastDate = new Date(Date.UTC(year, parseInt(month), 0));

    models.Planning.findOne({
        where: {
            firstDate: firstDate,
            lastDate: lastDate,
            categoryId: categoryId,
            validated: true
        }
    }).then(planning => {
        res.redirect("/planning/" + planning.id);
    })
});

router.get('/currents', function (req, res) {
    models.Slot.findAll({
        attributes: ['categoryId'],
        group: ['Slot.categoryId'],
        order: ['begin']
    }).then(slots => {
        var promises = [];

        for (var slot of slots) {
            promises.push(models.EmployeeCategory.findById(slot.categoryId))
        }

        Promise.all(promises).then(categories => {
            res.render('planning/home.ejs',
                {
                    categories: categories
                });
        })
    });
});

router.get('/:id(\\d+)/regenerate', function (req, res) {
    var id = req.params.id;

    models.Planning.findById(id).then(planning => {
        var categoryId = planning.categoryId;
        var month = (planning.firstDate.getMonth() + 1).toString().padStart(2, '0');
        var year = planning.firstDate.getFullYear();

        models.Planning.destroy({
            where: { id: id }
        }).then(status => {
            res.redirect('/planning/generate/category/' + categoryId + '/' + month + year);
        });
    });
});

router.get('/:id(\\d+)', function (req, res) {
    var id = req.params.id;
    models.Planning.findById(id, {
        include: [{
            model: models.Availability,
            as: 'presences',
            include: [
                {
                    model: models.Slot,
                    as: 'slot'
                }, {
                    model: models.Employee
                }
            ]
        }],
        order: [
            [
                { model: models.Availability, as: 'presences' },
                { model: models.Slot, as: 'slot' },
                'begin'
            ],
            [
                { model: models.Availability, as: 'presences' },
                models.Employee,
                'lastName'],
        ]
    }).then(planning => {
        var promises = [];

        promises.push(models.Slot.findAll({
            where: {
                categoryId: planning.getCategoryId()
            },
            order: ['begin']
        }));

        promises.push(models.Availability.findAll({
            where: {
                day: {
                    [models.Sequelize.Op.between]: [planning.firstDate, planning.lastDate]
                }
            },
            include: [
                {
                    model: models.Slot,
                    as: 'slot',
                    where: { categoryId: planning.getCategoryId() }
                }
            ],
            order: [[{ model: models.Slot, as: 'slot' }, 'begin']]
        }));

        Promise.all(promises).then(values => {
            var rawAvailabilities = values[1];

            planning.organisePresences();

            if (planning.validated) {
                res.render('planning/validated.ejs', {
                    planning: planning,
                    slots: values[0]
                });
            } else {
                res.render('planning/proposal.ejs', {
                    planning: planning,
                    slots: values[0]
                });
            }
        });
    });
});

router.get('/:id(\\d+)/calendar', function (req, res) {
    var id = req.params.id;
    models.Planning.findById(id, {
        include: [{
            model: models.Availability,
            as: 'presences',
            include: [
                {
                    model: models.Slot,
                    as: 'slot'
                }, {
                    model: models.Employee
                }
            ]
        }],
        order: [
            [
                { model: models.Availability, as: 'presences' },
                { model: models.Slot, as: 'slot' },
                'begin'
            ],
            [
                { model: models.Availability, as: 'presences' },
                models.Employee,
                'lastName'
            ],
        ]
    }).then(planning => {
        planning.organisePresencesByDate();
        if (planning.validated) {
            res.render('planning/validated-calendar.ejs', {
                planning: planning
            });
        } else {
            res.render('planning/proposal-calendar.ejs', {
                planning: planning
            });
        }
    });
});

router.get('/:id(\\d+)/validate', function (req, res) {
    var id = req.params.id;
    models.Planning.findById(id).then(planning => {
        var promises = [];

        promises.push(models.Planning.update(
            {
                validated: true
            },
            {
                where: { id: id }
            }
        ));

        promises.push(models.Planning.update({
            validated: false
        }, {
                where: {
                    categoryId: planning.categoryId,
                    firstDate: planning.firstDate,
                    lastDate: planning.lastDate,
                    validated: true,
                    id: { [models.Sequelize.Op.ne]: id }
                }
            }));

        Promise.all(promises).then(values => {
            res.redirect('/planning/' + id);
        });
    });

});

router.get('/:id(\\d+)/unvalidate', function (req, res) {
    var id = req.params.id;

    models.Planning.update(
        {
            validated: false
        },
        {
            where: { id: id }
        }).then(values => {
            res.redirect('/planning/' + id);
        });
});

router.get('/:id(\\d+)/:dateId(\\d{12,})/slot/:slotId(\\d+)/presences', function (req, res) {
    var date = new Date(parseInt(req.params.dateId));

    models.Availability.findAll({
        where: {
            PlanningId: req.params.id,
            slotId: req.params.slotId,
            day: date
        },
        include: [{ model: models.Employee }],
        order: [
            [models.Employee, 'lastName', 'ASC'],
            [models.Employee, 'firstName', 'ASC'],
        ]
    }).then(presences => {
        res.send(presences);
    });
});

router.get('/:id(\\d+)/presence/:presenceId(\\d+)/alternatives', function (req, res) {
    var id = req.params.id;
    var presenceId = req.params.presenceId;

    models.Availability.findById(presenceId).then(originalPresence => {
        models.Availability.findAll({
            where: {
                PlanningId: null,
                slotId: originalPresence.slotId,
                day: originalPresence.day
            },
            include: [{ model: models.Employee }]
        }).then(availabilities => {
            models.Availability.findAll({
                where: {
                    PlanningId: id,
                    slotId: originalPresence.slotId,
                    day: originalPresence.day
                }
            }).then(presences => {
                var originId = null;

                for (var presence of presences) {
                    for (var i in availabilities) {
                        var availability = availabilities[i];
                        if (presence.EmployeeId == availability.EmployeeId) {
                            if (originalPresence.EmployeeId == availability.EmployeeId) {
                                originId = availability.id;
                            }
                            availabilities.splice(i, 1);

                            break;
                        }
                    }
                }

                res.send({ availabilities: availabilities, originId: originId });
            })
        });
    });
});

router.post('/:id(\\d+)/presence/:presenceId(\\d+)/replace', function (req, res) {
    var id = req.params.id;
    var presenceId = req.params.presenceId;
    var availabilityId = req.body.availabilityId;
    var originId = req.body.originId;
    var enable = req.body.enable;

    if (enable == "true") {
        models.Availability.findById(availabilityId).then(availability => {
            models.Availability.update(
                {
                    EmployeeId: availability.EmployeeId
                },
                {
                    where: {
                        id: presenceId
                    }
                }).then(presence => {
                    res.send(true);
                });
        });
    } else {
        models.Availability.findById(originId).then(availability => {
            models.Availability.update(
                {
                    EmployeeId: availability.EmployeeId
                },
                {
                    where: {
                        id: presenceId
                    }
                }).then(presence => {
                    res.send(false);
                });
        });
    }
});

router.post('/:id(\\d+)/toggle-presence', function (req, res) {
    var id = req.params.id;
    var availabilityId = req.body.availabilityId;

    models.Availability.findById(availabilityId).then(availability => {
        models.Availability.findOrCreate({
            where: {
                slotId: availability.slotId,
                day: availability.day,
                EmployeeId: availability.EmployeeId,
                PlanningId: id
            },
            defaults: {
                slotId: availability.slotId,
                day: availability.day,
                EmployeeId: availability.EmployeeId,
                PlanningId: id
            }
        }).spread((presence, created) => {
            if (!created) {
                models.Availability.count({
                    where: {
                        slotId: availability.slotId,
                        day: availability.day,
                        PlanningId: id
                    }
                }).then(c => {
                    // Must be at least one person present for the date/slot
                    if (c > 1) {
                        models.Availability.destroy({
                            where: { id: presence.id }
                        }).then(status => {
                            res.send({ status: true });
                        });
                    } else {
                        res.send({ status: false, message: i18n.__("planning.mustremainone") });
                    }
                });

            } else {
                res.send({ status: true });
            }
        });
    });
});

router.get('/employee/:employeeId(\\d+)', function (req, res) {
    var employeeId = req.params.employeeId;
    var year = (new Date()).getFullYear();

    res.redirect("/planning/employee/" + employeeId + '/' + year);
});

router.get('/employee/:employeeId(\\d+)/:year(\\d{4})', function (req, res) {
    var employeeId = req.params.employeeId;
    var year = req.params.year;

    models.Employee.findById(employeeId).then(employee => {
        models.Planning.findAll({
            where: {
                firstDate: {
                    [models.Sequelize.Op.between]: [new Date(year, 0, 1), new Date(year, 11, 31)]
                },
                categoryId: employee.categoryId,
            },
            include: [
                {
                    model: models.Availability,
                    as: 'presences',
                    where: {
                        EmployeeId: employeeId
                    }
                }
            ]
        }).then(rawPlannings => {
            var plannings = {};

            for (var planning of rawPlannings) {
                var month = planning.firstDate.getMonth();
                if (typeof plannings[month] === 'undefined') {
                    plannings[month] = [planning];
                } else {
                    plannings[month].push(planning);
                }
            }

            res.render('planning/list-yearly-employee.ejs',
                {
                    plannings: plannings,
                    employee: employee,
                    year: year
                });
        });
    });
});

router.get("/employee/:employeeId(\\d+)/:month(\\d{2}):year(\\d{4})", function (req, res) {
    var employeeId = req.params.employeeId;
    var month = req.params.month;
    var year = req.params.year;

    var firstDate = new Date(Date.UTC(year, parseInt(month) - 1, 1));
    var lastDate = new Date(Date.UTC(year, parseInt(month), 0));

    models.Employee.findById(employeeId).then(employee => {
        models.Planning.findAll({
            where: {
                firstDate: firstDate,
                lastDate: lastDate
            },
            include: [
                {
                    model: models.Availability,
                    as: 'presences',
                    where: {
                        EmployeeId: employeeId
                    }
                }
            ],
            order: [
                ['validated', 'DESC'],
                ['createdAt', 'ASC']
            ]
        }).then(plannings => {
            res.render('planning/list-employee.ejs', {
                plannings: plannings,
                employee: employee
            });
        })
    });
});

router.get("/employee/:employeeId(\\d+)/:month(\\d{2}):year(\\d{4})/validated", function (req, res) {
    var employeeId = req.params.employeeId;
    var month = req.params.month;
    var year = req.params.year;

    var firstDate = new Date(Date.UTC(year, parseInt(month) - 1, 1));
    var lastDate = new Date(Date.UTC(year, parseInt(month), 0));

    models.Employee.findById(employeeId).then(employee => {
        models.Planning.findOne({
            where: {
                firstDate: firstDate,
                lastDate: lastDate,
                categoryId: {
                    [models.Sequelize.Op.or]: [employee.categoryId, null]
                },
                validated: true
            },
            include: [
                {
                    model: models.Availability,
                    as: 'presences',
                    where: {
                        EmployeeId: employeeId
                    }
                }
            ]
        }).then(planning => {
            res.redirect("/planning/" + planning.id);
        });
    });
});


module.exports = router;
