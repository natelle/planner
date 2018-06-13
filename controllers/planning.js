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
    var employees, agendas, availabilities;

    promises.push(models.Employee.findAll().then(e => {
        employees = e;
    }));

    promises.push(models.Agenda.findAll().then(a => {
        agendas = a;
    }));

    promises.push(models.EmployeeAvailability.findAll().then(a => {
        availabilities = a;
    }));

    Promise.all(promises).then(values => {
        var planner = new Planner({
            firstDate: firstDate,
            lastDate: lastDate,
            employees: employees,
            agendas: agendas,
            availabilities: availabilities
        });

        planner.generate();
    });


});

module.exports = router;
