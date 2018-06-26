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

        var rawPlannings = planner.generate();
        // var plannings = {};
        // var employees = {};
        // var promises = [];
        //
        // for(var i in rawPlannings) {
        //     if(typeof employees[rawPlannings[i].EmployeeId] === 'undefined') {
        //         promises.push(models.Employee.findById(rawPlannings[i].EmployeeId).then(employee => {
        //             employees[rawPlannings[i].EmployeeId] = employee;
        //         }));
        //     }
        //
        //     var timestamp = rawPlannings[i].day.getTime();
        //     if(typeof plannings[timestamp] === 'undefined') {
        //         plannings[timestamp] = {};
        //     }
        //
        //     var type = rawPlannings[i].type
        //     if(typeof plannings[timestamp][type] === 'undefined') {
        //         plannings[timestamp][type] = [rawPlannings[i]];
        //     } else {
        //         plannings[timestamp][type].push(rawPlannings[i]);
        //     }
        // }
        //
        // Promise.all(promises).then(status => {
        //     console.log(employees);
        //
        //     res.render('planning/propose.ejs', {
        //         plannings: plannings,
        //         employees: employees,
        //         firstDate: firstDate,
        //         lastDate: lastDate
        //     })
        // });
    });


});

module.exports = router;
