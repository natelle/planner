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
            promises.push(models.EmployeeCategory.findById(slot.categoryId));
        }

        Promise.all(promises).then(categories => {
            promises = [];

            var now = new Date();
            now.setHours(0, 0, 0, 0);
            var firstDate = new Date(now).setDate(1);
            var lastDate = new Date(now);
            lastDate.setMonth(now.getMonth() + 1);
            lastDate.setDate(0);

            for (var category of categories) {
                promises.push(models.Planning.findOne({
                    where: {
                        firstDate: {
                            [models.Sequelize.Op.between]: [firstDate, lastDate]
                        },
                        categoryId: category.id,
                        validated: true
                    }
                }));
            }

            Promise.all(promises).then(rawPlannings => {
                var plannings = {};

                for (var planning of rawPlannings) {
                    if (planning) {
                        plannings[planning.categoryId] = planning;
                    }
                }

                res.render('planning/home.ejs',
                    {
                        plannings: plannings,
                        categories: categories
                    }
                );
            });
        })
    });
});

router.get('/category/:categoryId(\\d+)', function (req, res) {
    res.redirect("/planning/category/" + req.params.categoryId + '/global/' + (new Date).getTime());
});

router.get('/category/:categoryId(\\d+)/global/:date(\\d{12,})', function (req, res) {
    var categoryId = req.params.categoryId;

    var date = new Date(parseInt(req.params.date));

    models.EmployeeCategory.findById(categoryId).then(category => {
        var interval = category.interval, dateMin, dateMax;

        switch (interval) {
            case "month":
                dateMin = new Date(Date.UTC(date.getFullYear(), 0, 1));
                dateMax = new Date(Date.UTC(date.getFullYear(), 11, 31));
                break;
            case "week":
            case "day":
                dateMin = new Date(Date.UTC(date.getFullYear(), date.getMonth(), 1));
                dateMax = new Date(Date.UTC(date.getFullYear(), date.getMonth() + 1, 0));
                break;
            default:
                throw "Category interval not supported."
        }

        models.Planning.findAll({
            where: {
                firstDate: {
                    [models.Sequelize.Op.between]: [dateMin, dateMax]
                },
                categoryId: category.id,
                interval: category.interval
            },
            order: [['validated', "DESC"]]
        }).then(rawPlannings => {
            var plannings = {};

            for (var planning of rawPlannings) {
                var key;

                switch (interval) {
                    case "month":
                        key = planning.firstDate.getMonth();
                        break;
                    case "week":
                        key = planning.firstDate.getWeek();
                        break;
                    case "day":
                        key = planning.firstDate.getDate();
                        break;
                }

                if (typeof plannings[key] === 'undefined') {
                    plannings[key] = [planning];
                } else {
                    plannings[key].push(planning);
                }
            }

            res.render('planning/list-' + interval + '.ejs',
                {
                    plannings: plannings,
                    category: category,
                    month: date.getMonth(),
                    year: date.getFullYear()
                }
            );
        });
    });
});

router.get('/category/:categoryId(\\d+)/:date(\\d{12,})', function (req, res) {
    var categoryId = req.params.categoryId;

    var date = new Date(parseInt(req.params.date));

    models.EmployeeCategory.findById(categoryId).then(category => {
        var interval = category.interval, dateMin, dateMax;

        switch (interval) {
            case "month":
                dateMin = new Date(Date.UTC(date.getFullYear(), date.getMonth(), 1));
                dateMax = new Date(Date.UTC(date.getFullYear(), date.getMonth() + 1, 0));
                break;
            case "week":
                var week = date.getWeek();

                dateMin = getFirstDateWeek(week, date.getFullYear());
                dateMax = getLastDateWeek(week, date.getFullYear());
                break;
            case "day":
                dateMin = new Date(date);
                dateMax = new Date(date);
                break;
            default:
                throw "Category interval not supported."
        }

        models.Planning.findAll({
            where: {
                firstDate: {
                    [models.Sequelize.Op.between]: [dateMin, dateMax]
                },
                categoryId: category.id,
                interval: category.interval
            },
            order: [
                ['validated', "DESC"],
                ['createdAt', 'ASC']
            ]
        }).then(plannings => {
            res.render('planning/list.ejs', {
                plannings: plannings,
                category: category,
                firstDate: dateMin,
                lastDate: dateMax
            });
        });
    });
});


router.get("/category/:categoryId(\\d+)/:month(\\d{2}):year(\\d{4})", function (req, res) {
    var categoryId = req.params.categoryId;
    var month = req.params.month;
    var year = req.params.year;

    var firstDate = new Date(Date.UTC(year, parseInt(month) - 1, 1));
    var lastDate = new Date(Date.UTC(year, parseInt(month), 0));

    models.EmployeeCategory.findById(categoryId).then(category => {
        models.Planning.findAll({
            where: {
                firstDate: firstDate,
                lastDate: lastDate,
                categoryId: category.id,
                interval: category.interval
            },
            order: [
                ['validated', 'DESC'],
                ['createdAt', 'ASC']
            ]
        }).then(plannings => {
            res.render('planning/list.ejs', {
                plannings: plannings,
                category: category,
                firstDate: firstDate,
                lastDate: lastDate
            });
        });
    });
});


// Planning generations

router.get('/generate/category/:categoryId(\\d+)', function (req, res) {
    models.EmployeeCategory.findById(req.params.categoryId).then(category => {
        res.render('planning/generate.ejs',
            {
                category: category
            }
        );
    })
});

router.post('/generate/category/:categoryId(\\d+)', function (req, res) {
    var firstDate = new Date(req.body.firstDate + "T00:00:00Z");
    var lastDate = new Date(req.body.lastDate + "T00:00:00Z");

    res.redirect("/planning/generate/category/" + req.params.categoryId + "/" + firstDate.getTime() + "-" + lastDate.getTime());
});

router.get('/generate/category/:categoryId(\\d+)/day-:day(\\d{2}):month(\\d{2}):year(\\d{4})', function (req, res) {
    var day = req.params.day;
    var month = req.params.month;
    var year = req.params.year;

    var firstDate = new Date(Date.UTC(year, parseInt(month) - 1, parseInt(day)));
    var lastDate = new Date(Date.UTC(year, parseInt(month) - 1, parseInt(day)));

    res.redirect('/planning/generate/category/' + req.params.categoryId + '/' + firstDate.getTime() + '-' + lastDate.getTime());
});

router.get('/generate/category/:categoryId(\\d+)/week-:week(\\d{2}):year(\\d{4})', function (req, res) {
    var week = req.params.week;
    var year = req.params.year;

    var simple = new Date(year, 0, 1 + (week - 1) * 7);
    var dow = simple.getDay();
    var weekStart = simple;

    if (dow <= 4) {
        weekStart.setDate(simple.getDate() - simple.getDay() + 1);
    } else {
        weekStart.setDate(simple.getDate() + 8 - simple.getDay());
    }

    var firstDate = new Date(Date.UTC(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate()));
    var lastDate = new Date(firstDate);
    lastDate.setDate(firstDate.getDate() + 6);

    res.redirect('/planning/generate/category/' + req.params.categoryId + '/' + firstDate.getTime() + '-' + lastDate.getTime());
});

router.get('/generate/category/:categoryId(\\d+)/month-:month(\\d{2}):year(\\d{4})', function (req, res) {
    var month = req.params.month;
    var year = req.params.year;

    var firstDate = new Date(Date.UTC(year, parseInt(month) - 1, 1));
    var lastDate = new Date(Date.UTC(year, parseInt(month), 0));

    res.redirect('/planning/generate/category/' + req.params.categoryId + '/' + firstDate.getTime() + '-' + lastDate.getTime());
});

router.get('/generate/category/:categoryId(\\d+)/year-:year(\\d{4})', async function (req, res) {
    var categoryId = req.params.categoryId;
    var year = req.params.year;

    // must populated with default availability/agenda... (optionnaly at least)

    var category = await models.EmployeeCategory.findById(categoryId);

    var rawSlots = await models.Slot.findAll({
        where: {
            categoryId: categoryId
        }
    });

    var slots = {};
    for (var slot of rawSlots) {
        slots[slot.id] = slot;
    }

    var rawEmployees = await models.Employee.findAll({
        where: {
            categoryId: categoryId
        }
    })

    var employees = {};
    for (var employee of rawEmployees) {
        employee.totalNumber = 0;
        employees[employee.id] = employee;
    }

    var maxI;
    switch (category.interval) {
        case "month":
            maxI = 12;
            break;
        case "week":
            maxI = 53;
            break;
        case "day":
            maxI = (year % 400 === 0 || (year % 100 !== 0 && year % 4 === 0)) ? 366 : 365;
            break;
        default:
            throw "Category interval not supported."
    }

    for (let i = 0, promise = Promise.resolve(null); i < maxI; i++) {
        promise = promise.then(previousPlanning => new Promise(resolve => {
            console.log("i = " + i);

            var firstDate, lastDate;
            switch (category.interval) {
                case "month":
                    firstDate = new Date(Date.UTC(year, i, 1));
                    lastDate = new Date(Date.UTC(year, i + 1, 0));
                    break;
                case "week":
                    firstDate = getFirstDateWeek(i + 1, year);
                    lastDate = getLastDateWeek(i + 1, year);
                    break;
                case "day":
                    firstDate = getDateYear(i + 1, year);
                    lastDate = getDateYear(i + 1, year);
                    break;
                default:
                    throw "Category interval not supported."
            }

            if (previousPlanning) {
                var employeesNumber = {};
                for (var presence of previousPlanning.presences) {
                    if (typeof employeesNumber[presence.EmployeeId] === 'undefined') {
                        employeesNumber[presence.EmployeeId] = slots[presence.slotId].getDuration();
                    } else {
                        employeesNumber[presence.EmployeeId] += slots[presence.slotId].getDuration();
                    }
                }

                for (var employeeId in employees) {
                    var employee = employees[employeeId];

                    employee.totalNumber += employeesNumber[employee.id];
                }
            }

            for (var employeeId in employees) {
                var employee = employees[employeeId];

                employee.number = Math.max((employee.yearlyNumber - employee.totalNumber) / (maxI - i), 0.5);
            }

            var employeesArray = [];
            for (var employeeId in employees) {
                employeesArray.push(employees[employeeId]);
            }

            generatePlanning(categoryId, firstDate, lastDate, employeesArray).then(planning => {
                resolve(planning);
                if (i == 11) {
                    // todo: must redirect to a page displaying all the new generated planning
                    res.redirect('/planning');
                }
            });
        }));
    }
});

function generatePlanning(categoryId, firstDate, lastDate, employees, parameters) {
    employees = (typeof employees !== "undefined") ? employees : null;

    return new Promise(resolve => {
        var promises = [];
        var agendas, availabilities, slots, category;

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
            }],
            order: [
                ['day'],
                [
                    { model: models.Slot, as: 'slot' },
                    'begin'
                ]
            ]
        }).then(a => {
            agendas = a;
        }));

        promises.push(models.Availability.findAll({
            where: {
                day: {
                    [models.Sequelize.Op.between]: [firstDate, lastDate]
                },
                planningId: null
            },
            include: [
                {
                    model: models.Slot,
                    where: { categoryId: categoryId },
                    as: 'slot'
                },
                {
                    model: models.Employee
                }
            ]
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

        if (!employees) {
            console.log("ok");

            promises.push(models.Employee.findAll({
                include: [{
                    model: models.EmployeeCategory,
                    where: { id: categoryId },
                    as: 'category'
                }]
            }).then(e => {
                employees = e;
            }));
        }

        promises.push(models.EmployeeCategory.findById(categoryId).then(c => {
            category = c;
        }));

        Promise.all(promises).then(values => {
            var planner = new Planner({
                firstDate: firstDate,
                lastDate: lastDate,
                employees: employees,
                slots: slots,
                agendas: agendas,
                availabilities: availabilities,
                category: category,
                parameters: parameters
            });

            planner.generate().then(generatedPlanning => {
                models.Planning.create(
                    {
                        firstDate: firstDate,
                        lastDate: lastDate,
                        validated: false,
                        generated: true,
                        success: generatedPlanning.success,
                        modified: false,
                        presences: generatedPlanning.presences,
                        categoryId: category.id,
                        interval: category.interval
                    },
                    {
                        include: [{
                            model: models.Availability,
                            as: 'presences'
                        }]
                    }).then(planning => {
                        resolve(planning);
                    });
            });
        });
    });
}

router.get('/generate/category/:categoryId(\\d+)/:firstDate(\\d{12,})-:lastDate(\\d{12,})', function (req, res) {
    var categoryId = req.params.categoryId;

    var firstDate = new Date(parseInt(req.params.firstDate));
    var lastDate = new Date(parseInt(req.params.lastDate));

    generatePlanning(categoryId, firstDate, lastDate, null, req.settings.planning.generation).then(planning => {
        res.redirect('/planning/' + planning.id);
    });
});


// Planning creation

router.get('/create/category/:categoryId(\\d+)', function (req, res) {
    models.EmployeeCategory.findById(req.params.categoryId).then(category => {
        res.render('planning/create.ejs',
            {
                category: category
            }
        );
    })
});

router.post('/create/category/:categoryId(\\d+)', function (req, res) {
    var firstDate = new Date(req.body.firstDate + "T00:00:00Z");
    var lastDate = new Date(req.body.lastDate + "T00:00:00Z");

    res.redirect("/planning/create/category/" + req.params.categoryId + "/" + firstDate.getTime() + "-" + lastDate.getTime());
});

router.get('/create/category/:categoryId(\\d+)/day-:day(\\d{2}):month(\\d{2}):year(\\d{4})', function (req, res) {
    var day = req.params.day;
    var month = req.params.month;
    var year = req.params.year;

    var firstDate = new Date(Date.UTC(year, parseInt(month) - 1, parseInt(day)));
    var lastDate = new Date(Date.UTC(year, parseInt(month) - 1, parseInt(day)));

    res.redirect('/planning/create/category/' + req.params.categoryId + '/' + firstDate.getTime() + '-' + lastDate.getTime());
});

router.get('/create/category/:categoryId(\\d+)/week-:week(\\d{2}):year(\\d{4})', function (req, res) {
    var week = req.params.week;
    var year = req.params.year;

    var simple = new Date(year, 0, 1 + (week - 1) * 7);
    var dow = simple.getDay();
    var weekStart = simple;

    if (dow <= 4) {
        weekStart.setDate(simple.getDate() - simple.getDay() + 1);
    } else {
        weekStart.setDate(simple.getDate() + 8 - simple.getDay());
    }

    var firstDate = new Date(Date.UTC(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate()));
    var lastDate = new Date(firstDate);
    lastDate.setDate(firstDate.getDate() + 6);

    res.redirect('/planning/create/category/' + req.params.categoryId + '/' + firstDate.getTime() + '-' + lastDate.getTime());
});

router.get('/create/category/:categoryId(\\d+)/month-:month(\\d{2}):year(\\d{4})', function (req, res) {
    var categoryId = req.params.categoryId;
    var month = req.params.month;
    var year = req.params.year;

    var firstDate = new Date(Date.UTC(year, parseInt(month) - 1, 1));
    var lastDate = new Date(Date.UTC(year, parseInt(month), 0));

    res.redirect('/planning/create/category/' + req.params.categoryId + '/' + firstDate.getTime() + '-' + lastDate.getTime());
});

router.get('/create/category/:categoryId(\\d+)/:firstDate(\\d{12,})-:lastDate(\\d{12,})', function (req, res) {
    var categoryId = req.params.categoryId;

    var firstDate = new Date(parseInt(req.params.firstDate));
    var lastDate = new Date(parseInt(req.params.lastDate));

    models.EmployeeCategory.findById(categoryId).then(category => {
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
                generated: false,
                presences: [],
                categoryId: category.id,
                interval: category.interval
            }).then(planning => {
                res.redirect("/planning/" + planning.id);
            });
        });
    });
});

router.get('/currents', function (req, res) {
    models.EmployeeCategory.findAll().then(categories => {
        var promises = [];

        for (var category of categories) {
            var interval = category.interval, dateMin, dateMax;
            var date = new Date();
            date.setHours(0, 0, 0, 0);

            switch (interval) {
                case "month":
                    dateMin = new Date(Date.UTC(date.getFullYear(), date.getMonth(), 1));
                    dateMax = new Date(Date.UTC(date.getFullYear(), date.getMonth() + 1, 0));
                    break;
                case "week":
                    var week = date.getWeek();

                    dateMin = getFirstDateWeek(week, date.getFullYear());
                    dateMax = getLastDateWeek(week, date.getFullYear());
                    break;
                case "day":
                    dateMin = new Date(date);
                    dateMax = new Date(date);
                    break;
                default:
                    throw "Category interval not supported."
            }

            console.log(category.name);
            console.log("dateMin = " + dateMin);
            console.log("dateMax = " + dateMax);



            promises.push(models.Planning.findOne({
                where: {
                    firstDate: {
                        [models.Sequelize.Op.between]: [dateMin, dateMax]
                    },
                    interval: category.interval,
                    validated: true,
                    categoryId: category.id
                },
                include: [
                    {
                        model: models.EmployeeCategory,
                        as: 'category',
                    }
                ],
                order: [
                    [{ model: models.EmployeeCategory, as: 'category' }, 'name']
                ]
            }));
        }

        Promise.all(promises).then(plannings => {
            console.log(plannings);


            res.render('planning/currents.ejs', {
                plannings: plannings.filter(planning => planning !== null)
            })
        })
    });
});

router.get('/:id(\\d+)/regenerate', function (req, res) {
    var id = req.params.id;

    models.Planning.findById(id).then(planning => {
        var categoryId = planning.categoryId;
        var firstDate = planning.firstDate.getTime();
        var lastDate = planning.lastDate.getTime();

        models.Availability.destroy({
            where: { planningId: id }
        }).then(status => {
            models.Planning.destroy({
                where: { id: id }
            }).then(status => {
                res.redirect('/planning/generate/category/' + categoryId + '/' + firstDate + '-' + lastDate);
            });
        });

    });
});

router.get('/:id(\\d+)', function (req, res) {
    var id = req.params.id;
    models.Planning.findById(id, {
        include: [
            {
                model: models.Availability,
                as: 'presences',
                include: [
                    {
                        model: models.Slot,
                        as: 'slot'
                    },
                    {
                        model: models.Employee
                    }
                ]
            },
            {
                model: models.EmployeeCategory,
                as: 'category'
            }
        ],
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

                agendas[day][slotId] = agenda;
            }

            for (var d = new Date(planning.firstDate); d <= planning.lastDate; d.setDate(d.getDate() + 1)) {
                if (typeof agendas[d.getTime()] === 'undefined') {
                    agendas[d.getTime()] = {};
                }
            }

            planning.organisePresences();

            if (planning.validated) {
                res.render('planning/validated.ejs', {
                    planning: planning,
                    slots: values[0],
                    agendas: agendas
                });
            } else if (planning.success && planning.generated) {
                res.render('planning/proposal.ejs', {
                    planning: planning,
                    slots: values[0],
                    agendas: agendas
                });
            } else if (!planning.generated) {
                res.render('planning/created.ejs', {
                    agendas: agendas,
                    planning: planning,
                    slots: values[0]
                });
            } else if (!planning.success) {
                res.render('planning/failure.ejs', {
                    agendas: agendas,
                    planning: planning,
                    slots: values[0]
                });
            }
        });
    });
});

router.get('/:id(\\d+)/delete', function (req, res) {
    var id = req.params.id;

    models.Planning.findById(id).then(planning => {
        if (planning) {
            var dateId = (planning.firstDate.getMonth() + 1).toString().padStart(2, '0') + planning.firstDate.getFullYear();

            models.Availability.destroy({
                where: { planningId: id }
            }).then(status => {
                models.Planning.destroy({
                    where: {
                        id: req.params.id
                    }
                }).then(status => {
                    res.redirect('/planning/category/' + planning.categoryId + '/' + dateId);
                });
            });
        } else {
            res.sendStatus(404);
        }
    });
});

router.get('/:id(\\d+)/calendar', function (req, res) {
    var id = req.params.id;

    models.Planning.findById(id, {
        include: [
            {
                model: models.Availability,
                as: 'presences',
                include: [
                    {
                        model: models.Slot,
                        as: 'slot'
                    },
                    {
                        model: models.Employee
                    }
                ]
            },
            {
                model: models.EmployeeCategory,
                as: 'category'
            }
        ],
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
        var promises = [], presences = [];

        // Check if matching availabilties are still existing
        for (let presence of planning.presences) {
            promises.push(models.Availability.findOne({
                where: {
                    EmployeeId: presence.EmployeeId,
                    day: presence.day,
                    slotId: presence.slotId,
                    planningId: null
                }
            }).then(availability => {
                presence = presence.toJSON();
                presence.missing = !availability;

                presences.push(presence);
            }));
        }

        Promise.all(promises).then(values => {
            planning.presences = presences;
            planning.organisePresencesByDate();

            var firstDate = new Date(planning.firstDate);
            firstDate.setDate(1);
            var lastDate = new Date(planning.lastDate);
            lastDate.setMonth(planning.lastDate.getMonth() + 1);
            lastDate.setDate(0);

            models.Agenda.findAll({
                where: {
                    day: {
                        [models.Sequelize.Op.between]: [firstDate, lastDate]
                    },
                },
                include: [
                    {
                        model: models.Slot,
                        as: 'slot',
                        where: {
                            categoryId: planning.categoryId
                        }
                    }
                ]
            }).then(rawAgendas => {
                var agendas = {};

                for (var agenda of rawAgendas) {
                    if (typeof agendas[agenda.day.getTime()] === "undefined") {
                        agendas[agenda.day.getTime()] = [agenda];
                    } else {
                        agendas[agenda.day.getTime()].push(agenda);
                    }
                }

                res.render('planning/calendar.ejs', {
                    planning: planning,
                    agendas: agendas
                });
            });
        });
    });
});

router.get('/:id(\\d+)/validate', function (req, res) {
    var id = req.params.id;
    models.Planning.findById(id).then(planning => {
        var promises = [];

        promises.push(models.Planning.update(
            {
                validated: true,
                modified: true
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
            validated: false,
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
    }).then(rawPresences => {
        var promises = [];
        var presences = [];

        // Check if matching availabilties are still existing
        for (let presence of rawPresences) {
            promises.push(models.Availability.findOne({
                where: {
                    EmployeeId: presence.EmployeeId,
                    day: presence.day,
                    slotId: presence.slotId,
                    planningId: null
                }
            }).then(availability => {
                presence = presence.toJSON();
                presence.missing = !availability;

                presences.push(presence);
            }));
        }

        Promise.all(promises).then(values => {
            res.send(presences);
        });
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

    models.Planning.update(
        {
            modified: true
        },
        {
            where: { id: id }
        }).then(values => {
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
});

router.post('/:id(\\d+)/toggle-presence', function (req, res) {
    var id = req.params.id;
    var availabilityId = req.body.availabilityId;

    models.Planning.update(
        {
            modified: true
        },
        {
            where: { id: id }
        }).then(values => {
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
});

router.get('/:id(\\d+)/summary', function (req, res) {
    var id = req.params.id;

    models.Planning.findById(id, {
        include: [
            {
                model: models.Availability,
                as: 'presences',
                include: [
                    {
                        model: models.Slot,
                        as: 'slot'
                    },
                    {
                        model: models.Employee
                    }
                ]
            },
            {
                model: models.EmployeeCategory,
                as: 'category'
            }
        ],
        order: [
            [
                { model: models.Availability, as: 'presences' },
                models.Employee,
                'lastName'
            ],
            [
                { model: models.Availability, as: 'presences' },
                models.Employee,
                'firstName'
            ]
        ]
    }).then(planning => {
        var summary = [];

        models.Availability.findAll({
            where: {
                day: {
                    [models.Sequelize.Op.between]: [planning.firstDate, planning.lastDate]
                },
                planningId: null,
            },
            include: [
                {
                    model: models.Slot,
                    as: 'slot'
                },
                {
                    model: models.Employee
                }
            ]
        }).then(availabilities => {
            for (var presence of planning.presences) {
                var index = summary.map(function (entry) { return entry.employee.id; }).indexOf(presence.EmployeeId);

                var entry;
                if (index > -1) {
                    entry = summary[index];
                    entry.slots++;
                    entry.duration += presence.slot.getDuration();
                } else {
                    var totalSlots = 0, totalDuration = 0;

                    for (var availability of availabilities) {
                        if (availability.EmployeeId == presence.EmployeeId) {
                            totalSlots++;
                            totalDuration += availability.slot.getDuration();
                        }
                    }

                    summary.push({
                        employee: presence.Employee,
                        slots: 1,
                        totalSlots: totalSlots,
                        duration: presence.slot.getDuration(),
                        totalDuration: totalDuration
                    });
                }
            }

            var mean = 0;
            var S = 0;
            for (var entry of summary) {
                mean += entry.duration;
            }
            mean /= summary.length;

            for (var entry of summary) {
                S += Math.pow(entry.duration - mean, 2);
            }
            S /= summary.length;
            S = Math.sqrt(S);
            console.log('mean = ' + mean);
            console.log('S = ' + S);

            res.send(summary);
        });
    });
});

router.get('/employee/:employeeId(\\d+)', function (req, res) {
    res.redirect("/planning/employee/" + req.params.employeeId + '/global/' + (new Date).getTime());
});

router.get('/employee/:employeeId(\\d+)/global/:date(\\d{12,})', function (req, res) {
    var employeeId = req.params.employeeId;

    var date = new Date(parseInt(req.params.date));

    models.Employee.findById(employeeId, {
        include: [
            {
                model: models.EmployeeCategory,
                as: 'category'
            }
        ]
    }).then(employee => {
        var interval = employee.category.interval, dateMin, dateMax;

        switch (interval) {
            case "month":
                dateMin = new Date(Date.UTC(date.getFullYear(), 0, 1));
                dateMax = new Date(Date.UTC(date.getFullYear(), 11, 31));
                break;
            case "week":
            case "day":
                dateMin = new Date(Date.UTC(date.getFullYear(), date.getMonth(), 1));
                dateMax = new Date(Date.UTC(date.getFullYear(), date.getMonth() + 1, 0));
                break;
            default:
                throw "Category interval not supported."
        }

        models.Planning.findAll({
            where: {
                firstDate: {
                    [models.Sequelize.Op.between]: [dateMin, dateMax]
                },
                interval: employee.category.interval
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
            order: [['validated', "DESC"]]
        }).then(rawPlannings => {
            var plannings = {};

            for (var planning of rawPlannings) {
                var key;

                switch (interval) {
                    case "month":
                        key = planning.firstDate.getMonth();
                        break;
                    case "week":
                        key = planning.firstDate.getWeek();
                        break;
                    case "day":
                        key = planning.firstDate.getDate();
                        break;
                }

                if (typeof plannings[key] === 'undefined') {
                    plannings[key] = [planning];
                } else {
                    plannings[key].push(planning);
                }
            }

            res.render('planning/list-' + interval + '-employee.ejs',
                {
                    plannings: plannings,
                    employee: employee,
                    month: date.getMonth(),
                    year: date.getFullYear()
                }
            );
        });
    });
});

router.get('/employee/:employeeId(\\d+)/:date(\\d{12,})', function (req, res) {
    var employeeId = req.params.employeeId;

    var date = new Date(parseInt(req.params.date));

    models.Employee.findById(employeeId, {
        include: [
            {
                model: models.EmployeeCategory,
                as: 'category'
            }
        ]
    }).then(employee => {
        var interval = employee.category.interval, dateMin, dateMax;

        switch (interval) {
            case "month":
                dateMin = new Date(Date.UTC(date.getFullYear(), date.getMonth(), 1));
                dateMax = new Date(Date.UTC(date.getFullYear(), date.getMonth() + 1, 0));
                break;
            case "week":
                var week = date.getWeek();

                dateMin = getFirstDateWeek(week, date.getFullYear());
                dateMax = getLastDateWeek(week, date.getFullYear());
                break;
            case "day":
                dateMin = new Date(date);
                dateMax = new Date(date);
                break;
            default:
                throw "Category interval not supported."
        }

        models.Planning.findAll({
            where: {
                firstDate: {
                    [models.Sequelize.Op.between]: [dateMin, dateMax]
                },
                interval: employee.category.interval
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
                ['validated', "DESC"],
                ['createdAt', 'ASC']
            ]
        }).then(plannings => {
            res.render('planning/list-employee.ejs', {
                plannings: plannings,
                employee: employee,
                firstDate: dateMin,
                lastDate: dateMax
            });
        });
    });
});

router.get('/:id(\\d+)/employee/:employeeId(\\d+)', function (req, res) {
    var id = req.params.id;
    var employeeId = req.params.employeeId;

    models.Employee.findById(employeeId).then(employee => {
        models.Planning.findById(id, {
            include: [
                {
                    model: models.Availability,
                    as: 'presences',
                    include: [
                        {
                            model: models.Slot,
                            as: 'slot'
                        },
                        {
                            model: models.Employee
                        }
                    ],
                    where: {
                        EmployeeId: employeeId
                    }
                },
                {
                    model: models.EmployeeCategory,
                    as: 'category'
                }
            ],
            order: [
                [
                    { model: models.Availability, as: 'presences' },
                    { model: models.Slot, as: 'slot' },
                    'begin'
                ]
            ]
        }).then(planning => {
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

                    agendas[day][slotId] = agenda;
                }

                for (var d = new Date(planning.firstDate); d <= planning.lastDate; d.setDate(d.getDate() + 1)) {
                    if (typeof agendas[d.getTime()] === 'undefined') {
                        agendas[d.getTime()] = {};
                    }
                }

                planning.organisePresences();

                res.render('planning/display-employee.ejs', {
                    planning: planning,
                    employee: employee,
                    slots: values[0],
                    agendas: agendas
                });
            });
        });
    });
});

router.get("/:id(\\d+)/employee/:employeeId(\\d+)/calendar", function (req, res) {
    var id = req.params.id;
    var employeeId = req.params.employeeId;

    models.Planning.findById(id, {
        include: [
            {
                model: models.Availability,
                as: 'presences',
                where: {
                    EmployeeId: employeeId
                },
                include: [
                    {
                        model: models.Slot,
                        as: 'slot'
                    }
                ]
            },
            {
                model: models.EmployeeCategory,
                as: 'category'
            }
        ],
        order: [
            [
                { model: models.Availability, as: 'presences' },
                { model: models.Slot, as: 'slot' },
                'begin'
            ]
        ]
    }).then(planning => {
        var promises = [], presences = [];

        // Check if matching availabilties are still existing
        for (let presence of planning.presences) {
            promises.push(models.Availability.findOne({
                where: {
                    EmployeeId: presence.EmployeeId,
                    day: presence.day,
                    slotId: presence.slotId,
                    planningId: null
                }
            }).then(availability => {
                presence = presence.toJSON();
                presence.missing = !availability;

                presences.push(presence);
            }));
        }

        Promise.all(promises).then(values => {
            planning.presences = presences;
            planning.organisePresencesByDate();

            models.Agenda.findAll({
                where: {
                    day: {
                        [models.Sequelize.Op.between]: [planning.firstDate, planning.lastDate]
                    },
                },
                include: [
                    {
                        model: models.Slot,
                        as: 'slot',
                        where: {
                            categoryId: planning.categoryId
                        }
                    }
                ]
            }).then(rawAgendas => {
                var agendas = {};

                for (var agenda of rawAgendas) {
                    if (typeof agendas[agenda.day.getTime()] === "undefined") {
                        agendas[agenda.day.getTime()] = [agenda];
                    } else {
                        agendas[agenda.day.getTime()].push(agenda);
                    }
                }

                models.Employee.findById(employeeId).then(employee => {
                    res.render('planning/calendar-employee.ejs', {
                        planning: planning,
                        employee: employee,
                        agendas: agendas
                    });
                });
            });
        });
    });
});

Date.prototype.getWeek = function () {
    var date = new Date(this.getTime());
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() + 3 - (date.getDay() + 6) % 7);
    var week1 = new Date(date.getFullYear(), 0, 4);
    return 1 + Math.round(((date.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
};

function getFirstDateWeek(week, year) {
    var simple = new Date(year, 0, 1 + (week - 1) * 7);
    var dow = simple.getDay();
    var weekStart = simple;

    if (dow <= 4) {
        weekStart.setDate(simple.getDate() - simple.getDay() + 1);
    } else {
        weekStart.setDate(simple.getDate() + 8 - simple.getDay());
    }

    return new Date(Date.UTC(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate()));
}

function getLastDateWeek(week, year) {
    var lastDateWeek = getFirstDateWeek(week, year);
    lastDateWeek.setDate(lastDateWeek.getDate() + 6);

    return lastDateWeek;
}

function getDateYear(day, year) {
    var date = new Date(year, 0);
    return new Date(date.setDate(day));
}

module.exports = router;
