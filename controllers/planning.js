var models  = require('../models');
var express = require('express');
const Planner = require('../bin/planner/planner.js');
var router  = express.Router();

router.get('/', function(req, res) {
    models.Slot.findAll({
        attributes: ['categoryId'],
        group: ['Slot.categoryId'],
        order: ['begin']
    }).then(slots => {
        var promises = [];

        for(var slot of slots) {
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

router.get('/category/:categoryId(\\d+)', function(req, res) {
    var categoryId = req.params.categoryId;
    var year = (new Date()).getFullYear();

    res.redirect("/planning/category/" + categoryId + '/' + year);
});

router.get('/category/:categoryId(\\d+)/:year(\\d{4})', function(req, res) {
    var categoryId = req.params.categoryId;
    categoryId = categoryId !== '0' ? categoryId : null;
    var year = req.params.year;

    models.EmployeeCategory.findById(categoryId).then(category => {
        res.render('planning/list-yearly.ejs',
        {
            category: category,
            year: year
        });
    });
});

router.get('/generate/category/:categoryId(\\d+)/:month(\\d{2}):year(\\d{4})', function(req, res) {
    var categoryId = req.params.categoryId;
    categoryId = categoryId !== '0' ? categoryId : null;
    var month = req.params.month;
    var year = req.params.year;

    var firstDate = new Date(year, parseInt(month) - 1, 1);
    var lastDate = new Date(year, parseInt(month), 0);

    var firstDateFormated = firstDate.getFullYear() + '-' + (firstDate.getMonth()+1).toString().padStart(2, '0') + '-' + firstDate.getDate().toString().padStart(2, '0') + ' 00:00:00Z';
    var lastDateFormated = lastDate.getFullYear() + '-' + (lastDate.getMonth()+1).toString().padStart(2, '0') + '-' + lastDate.getDate().toString().padStart(2, '0') + ' 00:00:00Z';

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

        if(planning) {
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

router.get("/category/:categoryId(\\d+)/:month(\\d{2}):year(\\d{4})/pending", function(req, res) {
    var month = req.params.month;
    var year = req.params.year;

    var firstDate = new Date(year, parseInt(month) - 1, 1);
    var lastDate = new Date(year, parseInt(month), 0);

    var firstDateFormated = firstDate.getFullYear() + '-' + (firstDate.getMonth()+1).toString().padStart(2, '0') + '-' + firstDate.getDate().toString().padStart(2, '0') + ' 00:00:00Z';
    var lastDateFormated = lastDate.getFullYear() + '-' + (lastDate.getMonth()+1).toString().padStart(2, '0') + '-' + lastDate.getDate().toString().padStart(2, '0') + ' 00:00:00Z';

    models.Planning.findAll({
        where: {
            firstDate: firstDateFormated,
            lastDate: lastDateFormated,
            categoryId: req.params.categoryId,
            validated: false
        },
        order: [
            [ 'createdAt', 'ASC' ],
        ]
    }).then(plannings => {
        res.render('planning/pending.ejs', {
            plannings: plannings
        });
    })
});

router.get("/category/:categoryId(\\d+)/:month(\\d{2}):year(\\d{4})/validated", function(req, res) {
    var month = req.params.month;
    var year = req.params.year;

    var firstDate = new Date(year, parseInt(month) - 1, 1);
    var lastDate = new Date(year, parseInt(month), 0);

    var firstDateFormated = firstDate.getFullYear() + '-' + (firstDate.getMonth()+1).toString().padStart(2, '0') + '-' + firstDate.getDate().toString().padStart(2, '0') + ' 00:00:00Z';
    var lastDateFormated = lastDate.getFullYear() + '-' + (lastDate.getMonth()+1).toString().padStart(2, '0') + '-' + lastDate.getDate().toString().padStart(2, '0') + ' 00:00:00Z';

    models.Planning.findAll({
        where: {
            firstDate: firstDateFormated,
            lastDate: lastDateFormated,
            categoryId: req.params.categoryId,
            validated: true
        },
        order: [
            [ 'createdAt', 'ASC' ],
        ]
    }).then(plannings => {
        res.render('planning/pending.ejs', {
            plannings: plannings
        });
    })
});

router.get('/:id(\\d+)/regenerate', function(req, res) {
    var id = req.params.id;

    models.Planning.findById(id).then(planning => {
        var categoryId = planning.categoryId;
        var month = (planning.firstDate.getMonth()+1).toString().padStart(2, '0');
        var year = planning.firstDate.getFullYear();

        models.Planning.destroy({
            where: { id: id }
        }).then(status => {
            res.redirect('/planning/generate/category/'+ categoryId + '/' + month + year);
        });
    });
});

router.get('/:id(\\d+)', function(req, res) {
    var id = req.params.id;
    models.Planning.findById(id, {
        include: [{
            model: models.Availability,
            as: 'presences',
            include: [
                {
                    model: models.Slot,
                    as: 'slot'
                },{
                    model: models.Employee
                }
            ]
        }],
        order: [
            [ {model: models.Availability, as: 'presences'}, {model: models.Slot, as: 'slot'}, 'begin', 'ASC' ],
            [ {model: models.Availability, as: 'presences'}, models.Employee, 'lastName', 'ASC' ],
        ]
    }).then(planning => {
        var promises = [];

        promises.push(models.Slot.findAll({
            where: {
                categoryId: planning.getCategoryId()
            },
            order: ['begin']
        }));

        var firstDateFormated = planning.firstDate.getFullYear() + '-' + (planning.firstDate.getMonth()+1).toString().padStart(2, '0') + '-' + planning.firstDate.getDate().toString().padStart(2, '0') + ' 00:00:00Z';
        var lastDateFormated = planning.lastDate.getFullYear() + '-' + (planning.lastDate.getMonth()+1).toString().padStart(2, '0') + '-' + planning.lastDate.getDate().toString().padStart(2, '0') + ' 00:00:00Z';
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
                    where: { categoryId: planning.getCategoryId()}
                }
            ],
            order: [[ {model: models.Slot, as: 'slot'}, 'begin']]
        }));

        Promise.all(promises).then(values => {
            var rawAvailabilities = values[1];

            planning.organisePresences();
            if(planning.validated) {
                res.render('planning/update.ejs', {
                    planning: planning,
                    slots: values[0]
                });
            } else {
                res.render('planning/proposal.ejs', {
                    planning: planning,
                    slots: values[0]
                });
            }
        })
    });

    router.get('/:id(\\d+)/validate', function(req, res) {
        models.Planning.update({
            validated: true
        }, {where: { id: req.params.id }}).then(planning => {
            // TODO: change redirect
            res.redirect('/planning');
        });
    });

    router.get('/:id(\\d+)/:dateId(\\d{4}-\\d{2}-\\d{2})/slot/:slotId(\\d+)/presences', function(req, res) {
        var date = req.params.dateId + " 00:00:00Z";

        models.Availability.findAll({
            where: {
                PlanningId: req.params.id,
                slotId: req.params.slotId,
                day: date
            },
            include: [{ model: models.Employee }],
            order: [
                [ models.Employee, 'lastName', 'ASC' ],
                [ models.Employee, 'firstName', 'ASC' ],
            ]
        }).then(presences => {
            res.send(presences);
        });
    });

    router.get('/:id(\\d+)/presence/:presenceId(\\d+)/alternatives', function(req, res) {
        var id = req.params.id;
        var presenceId = req.params.presenceId;

        models.Availability.findById(presenceId).then(originalPresence => {
            var date = originalPresence.day.getFullYear() + '-' + (originalPresence.day.getMonth()+1).toString().padStart(2, '0') + '-' + originalPresence.day.getDate().toString().padStart(2, '0') + ' 00:00:00Z';

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

                    for(var presence of presences) {
                        for(var i in availabilities) {
                            var availability = availabilities[i];
                            if(presence.EmployeeId == availability.EmployeeId) {
                                if(originalPresence.EmployeeId == availability.EmployeeId) {
                                    originId = availability.id;
                                }
                                availabilities.splice(i, 1);

                                break;
                            }
                        }
                    }

                    res.send({availabilities: availabilities, originId: originId});
                })
            });
        });
    });

    router.post('/:id(\\d+)/presence/:presenceId(\\d+)/replace', function(req, res) {
        var id = req.params.id;
        var presenceId = req.params.presenceId;
        var availabilityId = req.body.availabilityId;
        var originId = req.body.originId;
        var enable = req.body.enable;

        if(enable == "true") {
            models.Availability.findById(availabilityId).then(availability => {
                models.Availability.update({
                    EmployeeId: availability.EmployeeId
                },
                {where: {
                    id: presenceId}
                }).then(presence => {
                    res.send(true);
                });
            });
        } else {
            models.Availability.findById(originId).then(availability => {
                models.Availability.update({
                    EmployeeId: availability.EmployeeId
                },
                {where: {
                    id: presenceId}
                }).then(presence => {
                    res.send(false);
                });
            });
        }
    });

    router.post('/:id(\\d+)/toggle-presence', function(req, res) {
        var id = req.params.id;
        var availabilityId = req.body.availabilityId;

        models.Availability.findById(availabilityId).then(availability => {
            var dateFormated = availability.day.getFullYear() + '-' + (availability.day.getMonth()+1).toString().padStart(2, '0') + '-' + availability.day.getDate().toString().padStart(2, '0') + ' 00:00:00Z';

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
                if(!created) {
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
});

module.exports = router;
