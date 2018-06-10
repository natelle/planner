var models  = require('../models');
var express = require('express');
var router  = express.Router();

router.get('/add', function(req, res) {
    res.render('employee/add.ejs');
});

router.post('/add', function(req, res) {
    models.Employee.create({
        firstName: req.body.firstName,
        lastName: req.body.lastName,
        category: req.body.category
    }).then(employee => {
        res.redirect('/employee');
    });
});

router.get('/:id/update', function(req, res) {
    var id = req.params.id;

    models.Employee.findById(id).then(employee => {
        res.render('employee/update.ejs', {employee: employee});
    });
});

router.post('/:id/update', function(req, res) {
    models.Employee.update({
        firstName: req.body.firstName,
        lastName: req.body.lastName,
        category: req.body.category
    }, {where: { id: req.params.id }}).then(employee => {
        res.redirect('/employee');
    });
});

router.get('/:id/delete', function(req, res) {
    var id = req.params.id;

    models.Employee.destroy({
        where: {
            id: id
        }
    }).then(status => {
        res.redirect('/employee');
    });
});

router.get('/', function(req, res) {
    models.Employee.findAll({
        order: [
            ['lastName', 'ASC'],
            ['firstName', 'ASC']
        ]
    }).then(employees => {
        res.render('employee/list-employees.ejs',
        {
            employees: employees
        });
    });
});

router.get('/:id/availabilities/:year(\\d{4})', function(req, res) {
    var id = req.params.id;
    var year = req.params.year;

    models.Employee.findById(id).then(employee => {
        res.render('employee/list-yearly-availabilities.ejs',
        {
            employee: employee,
            year: year
        });
    });
});

router.get('/:id/availabilities/:month(\\d{2}):year(\\d{4})', function(req, res) {
    var id = req.params.id;
    var month = req.params.month;
    var year = req.params.year;

    var firstDate = new Date(year, parseInt(month) - 1, 1);
    var lastDate = new Date(year, parseInt(month), 0);

    var firstDateFormated = firstDate.getFullYear() + '-' + (firstDate.getMonth()+1).toString().padStart(2, '0') + '-' + firstDate.getDate().toString().padStart(2, '0') + ' 00:00:00Z';
    var lastDateFormated = lastDate.getFullYear() + '-' + (lastDate.getMonth()+1).toString().padStart(2, '0') + '-' + lastDate.getDate().toString().padStart(2, '0') + ' 00:00:00Z';

    models.Employee.findById(id).then(employee => {
        var availabilities = [];
        var promises = [];

        for(var d=firstDate; d<=lastDate; d.setDate(d.getDate() + 1)) {
            var date = d.getFullYear() + '-' + (d.getMonth()+1).toString().padStart(2, '0') + '-' + d.getDate().toString().padStart(2, '0') + ' 00:00:00Z';

            promises.push(models.EmployeeAvailability.findOrCreate({
                where: { Employeeid: req.params.id, day: date },
                defaults: {
                    Employeeid: req.params.id,
                    type: 'all',
                    presence: true,
                }}
            ).spread(function(employeeavailability, created){
                if (created){
                    employeeavailability.setEmployee(employee);
                }

                availabilities.push(employeeavailability);
            }));
        }

        Promise.all(promises).then(values => {
            res.render('employee/list-availabilities.ejs',
            {
                employee: employee,
                availabilities: availabilities
            });
        });
    });
});

router.get('/:id/availabilities/set/:month(\\d{2}):year(\\d{4})', function(req, res) {
    var id = req.params.id;
    var month = req.params.month;
    var year = req.params.year;

    var firstDate = new Date(year, parseInt(month) - 1, 1);
    var lastDate = new Date(year, parseInt(month), 0);

    var firstDateFormated = firstDate.getFullYear() + '-' + (firstDate.getMonth()+1).toString().padStart(2, '0') + '-' + firstDate.getDate().toString().padStart(2, '0') + ' 00:00:00Z';
    var lastDateFormated = lastDate.getFullYear() + '-' + (lastDate.getMonth()+1).toString().padStart(2, '0') + '-' + lastDate.getDate().toString().padStart(2, '0') + ' 00:00:00Z';

    models.Employee.findById(id).then(employee => {
        var availabilities = [];
        var promises = [];

        for(var d=firstDate; d<=lastDate; d.setDate(d.getDate() + 1)) {
            var date = d.getFullYear() + '-' + (d.getMonth()+1).toString().padStart(2, '0') + '-' + d.getDate().toString().padStart(2, '0') + ' 00:00:00Z';

            promises.push(models.EmployeeAvailability.findOrCreate({
                where: { Employeeid: req.params.id, day: date },
                defaults: {
                    Employeeid: req.params.id,
                    type: 'all',
                    presence: true,
                }}
            ).spread(function(employeeavailability, created){
                if (created){
                    employeeavailability.setEmployee(employee);
                }

                availabilities.push(employeeavailability);
            }));
        }

        Promise.all(promises).then(values => {
            res.render('employee/set-availabilities.ejs',
            {
                employee: employee,
                availabilities: availabilities
            });
        });
    });
});

router.post('/:id/availabilities/set', function(req, res) {
    var id = req.params.id;
    var presences = req.body.presences;

    models.Employee.findById(id).then(employee => {
        for(var date in presences) {
            var d = date;

            models.EmployeeAvailability.findOrCreate({
                where: { Employeeid: req.params.id, day: date + " 00:00:00Z" },
                defaults: {
                    Employeeid: req.params.id,
                    type: presences[date].type,
                    presence: presences[date].presence,
                }}
            ).spread(function(employeeavailability, created){
                if (created){
                    employeeavailability.setEmployee(employee);
                }
            });
        }

    });

    res.send("bien joué!")
});

router.post('/:id/availabilities/type/set', function(req, res) {
    var date = req.body.dateId + " 00:00:00Z";

    models.EmployeeAvailability.update({
        type: req.body.value
    },
    {where: { Employeeid: req.params.id, day: date }}).then(employee => {
        res.send("maj!")
    });
});

router.post('/:id/availabilities/presence/set', function(req, res) {
    var date = req.body.dateId + " 00:00:00Z";

    models.EmployeeAvailability.update({
        presence: req.body.value
    },
    {where: { Employeeid: req.params.id, day: date }}).then(employee => {
        res.send("maj!")
    });
});

module.exports = router;
