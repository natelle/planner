var models  = require('../models');
var express = require('express');
const Planner = require('../bin/planner/planner.js');
var router  = express.Router();

router.get('/', function(req, res) {
    res.render('planning/home.ejs');
});

router.get('/generate/:categoryId(\\d+)/:month(\\d{2}):year(\\d{4})', function(req, res) {
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
            console.log("categoryId = " + categoryId);
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
            res.redirect('/planning');
        });
    });

    router.post('/:id(\\d+)/toggle-availability', function(req, res) {
        var id = req.params.id;
        var availabilityId = req.body.availabilityId;

        res.send(id + " " + availabilityId);
    });
});

module.exports = router;
