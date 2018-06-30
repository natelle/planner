var models = require('../models');
var express = require('express');
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
                    [models.Sequelize.Op.between]: [year + "-01-01 00:00:00Z", year + "-12-31 00:00:00Z"]
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

    var firstDate = new Date(year, parseInt(month) - 1, 1);
    var lastDate = new Date(year, parseInt(month), 0);

    var firstDateFormated = firstDate.getFullYear() + '-' + (firstDate.getMonth() + 1).toString().padStart(2, '0') + '-' + firstDate.getDate().toString().padStart(2, '0') + ' 00:00:00Z';
    var lastDateFormated = lastDate.getFullYear() + '-' + (lastDate.getMonth() + 1).toString().padStart(2, '0') + '-' + lastDate.getDate().toString().padStart(2, '0') + ' 00:00:00Z';

    var promises = [];
    var employees, agendas, availabilities, slots;

    promises.push(models.Agenda.findAll({
        where: {
            day: {
                [models.Sequelize.Op.and]: {
                    [models.Sequelize.Op.gte]: firstDateFormated,
                    [models.Sequelize.Op.lte]: lastDateFormated
                }
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
                [models.Sequelize.Op.and]: {
                    [models.Sequelize.Op.gte]: firstDateFormated,
                    [models.Sequelize.Op.lte]: lastDateFormated
                }
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

        var planning = planner.generate();

        if (planning) {
            models.Planning.create({
                firstDate: planning.firstDate,
                lastDate: planning.lastDate,
                validated: planning.validated,
                presences: planning.presences,
                categoryId: categoryId
            }, {
                    include: [{
                        model: models.Availability,
                        as: 'presences'
                    }]
                }).then(createdPlanning => {
                    res.redirect('/planning/' + createdPlanning.id);
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

    var firstDate = new Date(year, parseInt(month) - 1, 1);
    var lastDate = new Date(year, parseInt(month), 0);

    var firstDateFormated = firstDate.getFullYear() + '-' + (firstDate.getMonth() + 1).toString().padStart(2, '0') + '-' + firstDate.getDate().toString().padStart(2, '0') + ' 00:00:00Z';
    var lastDateFormated = lastDate.getFullYear() + '-' + (lastDate.getMonth() + 1).toString().padStart(2, '0') + '-' + lastDate.getDate().toString().padStart(2, '0') + ' 00:00:00Z';

    models.Agenda.findAll({
        where: {
            day: {
                [models.Sequelize.op.between]: [firstDateFormated, lastDateFormated]
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
    }).then(agendas => {
       models.Planning.create({
            firstDate: firstDateFormated,
            lastDate: lastDateFormated,
            validated: false,
            presences: [],
            categoryId: categoryId
        }).then(createdPlanning => {
            res.render('planning.create.ejs', {
                agendas: agendas
            });
        });
    });
});

router.get("/category/:categoryId(\\d+)/:month(\\d{2}):year(\\d{4})", function (req, res) {
    var categoryId = req.params.categoryId;
    categoryId = categoryId !== '0' ? categoryId : null;
    var month = req.params.month;
    var year = req.params.year;

    var firstDate = new Date(year, parseInt(month) - 1, 1);
    var lastDate = new Date(year, parseInt(month), 0);

    var firstDateFormated = firstDate.getFullYear() + '-' + (firstDate.getMonth() + 1).toString().padStart(2, '0') + '-' + firstDate.getDate().toString().padStart(2, '0') + ' 00:00:00Z';
    var lastDateFormated = lastDate.getFullYear() + '-' + (lastDate.getMonth() + 1).toString().padStart(2, '0') + '-' + lastDate.getDate().toString().padStart(2, '0') + ' 00:00:00Z';

    models.Planning.findAll({
        where: {
            firstDate: firstDateFormated,
            lastDate: lastDateFormated,
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

    var firstDate = new Date(year, parseInt(month) - 1, 1);
    var lastDate = new Date(year, parseInt(month), 0);

    var firstDateFormated = firstDate.getFullYear() + '-' + (firstDate.getMonth() + 1).toString().padStart(2, '0') + '-' + firstDate.getDate().toString().padStart(2, '0') + ' 00:00:00Z';
    var lastDateFormated = lastDate.getFullYear() + '-' + (lastDate.getMonth() + 1).toString().padStart(2, '0') + '-' + lastDate.getDate().toString().padStart(2, '0') + ' 00:00:00Z';

    models.Planning.findOne({
        where: {
            firstDate: firstDateFormated,
            lastDate: lastDateFormated,
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
            [{ model: models.Availability, as: 'presences' }, { model: models.Slot, as: 'slot' }, 'begin', 'ASC'],
            [{ model: models.Availability, as: 'presences' }, models.Employee, 'lastName', 'ASC'],
        ]
    }).then(planning => {
        var promises = [];

        promises.push(models.Slot.findAll({
            where: {
                categoryId: planning.getCategoryId()
            },
            order: ['begin']
        }));

        var firstDateFormated = planning.firstDate.getFullYear() + '-' + (planning.firstDate.getMonth() + 1).toString().padStart(2, '0') + '-' + planning.firstDate.getDate().toString().padStart(2, '0') + ' 00:00:00Z';
        var lastDateFormated = planning.lastDate.getFullYear() + '-' + (planning.lastDate.getMonth() + 1).toString().padStart(2, '0') + '-' + planning.lastDate.getDate().toString().padStart(2, '0') + ' 00:00:00Z';
        promises.push(models.Availability.findAll({
            where: {
                day: {
                    [models.Sequelize.Op.and]: {
                        [models.Sequelize.Op.gte]: firstDateFormated,
                        [models.Sequelize.Op.lte]: lastDateFormated
                    }
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
            [{ model: models.Availability, as: 'presences' }, { model: models.Slot, as: 'slot' }, 'begin', 'ASC'],
            [{ model: models.Availability, as: 'presences' }, models.Employee, 'lastName', 'ASC'],
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

        promises.push(models.Planning.update({
            validated: true
        }, {
                where: { id: id }
            }));

        var firstDateFormated = planning.firstDate.getFullYear() + '-' + (planning.firstDate.getMonth() + 1).toString().padStart(2, '0') + '-' + planning.firstDate.getDate().toString().padStart(2, '0') + ' 00:00:00Z';
        var lastDateFormated = planning.lastDate.getFullYear() + '-' + (planning.lastDate.getMonth() + 1).toString().padStart(2, '0') + '-' + planning.lastDate.getDate().toString().padStart(2, '0') + ' 00:00:00Z';

        promises.push(models.Planning.update({
            validated: false
        }, {
                where: {
                    categoryId: planning.categoryId,
                    firstDate: firstDateFormated,
                    lastDate: lastDateFormated,
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

    models.Planning.update({
        validated: false
    }, {
            where: { id: id }
        }).then(values => {
            res.redirect('/planning/' + id);
        });
});

router.get('/:id(\\d+)/:dateId(\\d{4}-\\d{2}-\\d{2})/slot/:slotId(\\d+)/presences', function (req, res) {
    var date = req.params.dateId + " 00:00:00Z";

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
        var date = originalPresence.day.getFullYear() + '-' + (originalPresence.day.getMonth() + 1).toString().padStart(2, '0') + '-' + originalPresence.day.getDate().toString().padStart(2, '0') + ' 00:00:00Z';

        models.Availability.findAll({
            where: {
                PlanningId: null,
                slotId: originalPresence.slotId,
                day: date
            },
            include: [{ model: models.Employee }]
        }).then(availabilities => {
            models.Availability.findAll({
                where: {
                    PlanningId: id,
                    slotId: originalPresence.slotId,
                    day: date
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
            models.Availability.update({
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
            models.Availability.update({
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
        var dateFormated = availability.day.getFullYear() + '-' + (availability.day.getMonth() + 1).toString().padStart(2, '0') + '-' + availability.day.getDate().toString().padStart(2, '0') + ' 00:00:00Z';

        models.Availability.findOrCreate({
            where: {
                slotId: availability.slotId,
                day: dateFormated,
                EmployeeId: availability.EmployeeId,
                PlanningId: id
            },
            defaults: {
                slotId: availability.slotId,
                day: dateFormated,
                EmployeeId: availability.EmployeeId,
                PlanningId: id
            }
        }).spread((presence, created) => {
            if (!created) {
                models.Availability.destroy({
                    where: { id: presence.id }
                }).then(status => {
                    res.send(false);
                });
            } else {
                res.send(presence);
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
                    [models.Sequelize.Op.between]: [year + "-01-01 00:00:00Z", year + "-12-31 00:00:00Z"]
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

    var firstDate = new Date(year, parseInt(month) - 1, 1);
    var lastDate = new Date(year, parseInt(month), 0);

    var firstDateFormated = firstDate.getFullYear() + '-' + (firstDate.getMonth() + 1).toString().padStart(2, '0') + '-' + firstDate.getDate().toString().padStart(2, '0') + ' 00:00:00Z';
    var lastDateFormated = lastDate.getFullYear() + '-' + (lastDate.getMonth() + 1).toString().padStart(2, '0') + '-' + lastDate.getDate().toString().padStart(2, '0') + ' 00:00:00Z';

    models.Employee.findById(employeeId).then(employee => {
        models.Planning.findAll({
            where: {
                firstDate: firstDateFormated,
                lastDate: lastDateFormated
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

    var firstDate = new Date(year, parseInt(month) - 1, 1);
    var lastDate = new Date(year, parseInt(month), 0);

    var firstDateFormated = firstDate.getFullYear() + '-' + (firstDate.getMonth() + 1).toString().padStart(2, '0') + '-' + firstDate.getDate().toString().padStart(2, '0') + ' 00:00:00Z';
    var lastDateFormated = lastDate.getFullYear() + '-' + (lastDate.getMonth() + 1).toString().padStart(2, '0') + '-' + lastDate.getDate().toString().padStart(2, '0') + ' 00:00:00Z';

    models.Employee.findById(employeeId).then(employee => {
        models.Planning.findOne({
            where: {
                firstDate: firstDateFormated,
                lastDate: lastDateFormated,
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
