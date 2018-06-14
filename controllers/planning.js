var models  = require('../models');
var express = require('express');
const Planner = require('../bin/planner/planner.js');
var router  = express.Router();

router.get('/', function(req, res) {
    res.render('planning/home.ejs');
});

router.get('/generate/:month(\\d{2}):year(\\d{4})', function(req, res) {
    var month = req.params.month;
    var year = req.params.year;

    var firstDate = new Date(year, parseInt(month) - 1, 1);
    var lastDate = new Date(year, parseInt(month), 0);

    var promises = [];
    var employeeArray, agendas, availabilities;

    promises.push(models.Agenda.findAll().then(a => {
        agendas = a;
    }));
    promises.push(models.EmployeeAvailability.findAll().then(a => {
        availabilities = a;
    }));
    promises.push(models.Employee.findAll().then(e => {
        employeeArray = e;
    }));

    Promise.all(promises).then(values => {
        console.log(employeeArray);

        var planner = new Planner({
            firstDate: firstDate,
            lastDate: lastDate,
            employees: employeeArray,
            agendas: agendas,
            availabilities: availabilities
        });

        var rawPlannings = planner.generate();
        var plannings = {};
        var employees = {};
        var promises = [];

        for(var i in rawPlannings) {
            if(typeof employees[rawPlannings[i].EmployeeId] === 'undefined') {
                promises.push(models.Employee.findById(rawPlannings[i].EmployeeId).then(employee => {
                    employees[rawPlannings[i].EmployeeId] = employee;
                }));
            }

            var timestamp = rawPlannings[i].day.getTime();
            if(typeof plannings[timestamp] === 'undefined') {
                plannings[timestamp] = {};
            }

            var type = rawPlannings[i].type
            if(typeof plannings[timestamp][type] === 'undefined') {
                plannings[timestamp][type] = [rawPlannings[i]];
            } else {
                plannings[timestamp][type].push(rawPlannings[i]);
            }
        }

        Promise.all(promises).then(status => {
            console.log(employees);

            res.render('planning/propose.ejs', {
                plannings: plannings,
                employees: employees,
                firstDate: firstDate,
                lastDate: lastDate
            })
        });
    });


});

module.exports = router;
