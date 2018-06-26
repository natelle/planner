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
            models.Planning.create({
                firstDate: planning.firstDate,
                lastDate: planning.lastDate,
                temp: planning.temp,
                presences: planning.presences
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
            include: [{
                model: models.Slot,
                as: 'slot',
            }]
        }]
    }).then(planning => {
        planning.organisePresences();
        
        res.render('planning/update.ejs', {
            planning: planning
        });
    });



    // promises = [];
    // console.log(values);
    //
    // for(var planning of plannings) {
    //     promises.push(models.Planning.findById(planning.id,
    //         {
    //             include: [
    //                 {
    //                     model: models.Slot,
    //                     as: 'slot'
    //                 },
    //                 {
    //                     model: models.Employee,
    //                     //as: 'employee'
    //                 }
    //             ]}
    //         ));
    //     }
    //
    //     Promise.all(promises).then(rawPlannings => {
    //         var plannings = {};
    //
    //         for(var planning of rawPlannings) {
    //             console.log(planning.slot.name);
    //             var day = planning.day;
    //
    //             if(typeof plannings[day] === "undefined") {
    //                 plannings[day] = {};
    //             }
    //
    //             var slotId = planning.slot.id;
    //
    //             if(typeof plannings[day][slotId] === "undefined") {
    //                 plannings[day][slotId] = [planning];
    //             } else {
    //                 plannings[day][slotId].push(planning);
    //             }
    //         }
    //
    //         res.render('planning/propose.ejs', {
    //             plannings: plannings,
    //             employees: employees,
    //             firstDate: new Date(firstDateFormated),
    //             lastDate: new Date(lastDateFormated)
    //         });
    //     });
    //         });
    //     }
    // });
});

module.exports = router;
