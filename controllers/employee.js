var models  = require('../models');
var express = require('express');
var router  = express.Router();

router.get('/', function(req, res) {
    models.Employee.findAll({
        order: [
            ['lastName', 'ASC'],
            ['firstName', 'ASC']
        ],
        include: [{
            model: models.EmployeeCategory,
            as: 'category'
        }]

    }).then(employees => {
        res.render('employee/list.ejs',
        {
            employees: employees
        });
    });
});

router.get('/add', function(req, res) {
    models.EmployeeCategory.findAll({
        order: [
            ['name', 'ASC']
        ]
    }).then(categories => {
        res.render('employee/add.ejs',
        {
            categories: categories
        });
    });
});

router.post('/add', function(req, res) {
    models.Employee.create({
        firstName: req.body.firstName,
        lastName: req.body.lastName,
        email: req.body.email,
        phone: req.body.phone,
        categoryId: req.body.category
    }).then(employee => {
        res.redirect('/employee');
    });
});

router.get('/:id/update', function(req, res) {
    var id = req.params.id;

    var employeePromise = models.Employee.findById(id, {
        include: [{
            model: models.EmployeeCategory,
            as: 'category'
        }]
    });

    var categoriesPromise = models.EmployeeCategory.findAll({
        order: [
            ['name', 'ASC']
        ]
    });

    Promise.all([employeePromise, categoriesPromise]).then(values => {
        res.render('employee/update.ejs',
        {
            employee: values[0],
            categories: values[1]
        });
    });
});

router.post('/:id/update', function(req, res) {
    models.Employee.update({
        firstName: req.body.firstName,
        lastName: req.body.lastName,
        email: req.body.email,
        phone: req.body.phone,
        categoryId: req.body.category
    }, {where: { id: req.params.id }}).then(employee => {
        res.redirect('/employee');
    });
});

router.get('/:id/delete', function(req, res) {
    var id = req.params.id;

    models.Employee.destroy({
        where: { id: id }
    }).then(status => {
        res.redirect('/employee');
    });
});








router.get('/:id/availabilities', function(req, res) {
    var id = req.params.id;
    var year = (new Date()).getFullYear();

    res.redirect('/employee/' + id + '/availabilities/' + year);
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
            var key = "defaultDay" + d.getDay();
            var type = (employee[key] !== null) ? employee[key] : "time.allday";

            promises.push(models.Availability.findOrCreate({
                where: { Employeeid: req.params.id, day: date },
                defaults: {
                    Employeeid: req.params.id,
                    type: type,
                }}
            ).spread(function(availability, created){
                if (created){
                    availability.setEmployee(employee);
                }

                availabilities.push(availability);
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

router.get('/:id/availabilities/:month(\\d{2}):year(\\d{4})/reset', function(req, res) {
    var id = req.params.id;
    var month = req.params.month;
    var year = req.params.year;

    var firstDate = new Date(year, parseInt(month) - 1, 1);
    var lastDate = new Date(year, parseInt(month), 0);

    var firstDateFormated = firstDate.getFullYear() + '-' + (firstDate.getMonth()+1).toString().padStart(2, '0') + '-' + firstDate.getDate().toString().padStart(2, '0') + ' 00:00:00Z';
    var lastDateFormated = lastDate.getFullYear() + '-' + (lastDate.getMonth()+1).toString().padStart(2, '0') + '-' + lastDate.getDate().toString().padStart(2, '0') + ' 00:00:00Z';

    var promises = [];

    for(var d=firstDate; d<=lastDate; d.setDate(d.getDate() + 1)) {
        var date = d.getFullYear() + '-' + (d.getMonth()+1).toString().padStart(2, '0') + '-' + d.getDate().toString().padStart(2, '0') + ' 00:00:00Z';

        promises.push(models.Availability.destroy({
            where: { Employeeid: req.params.id, day: date }
        }));
    }

    Promise.all(promises).then(values => {
        res.redirect('/employee/' + id + '/availabilities/' + month + year);
    });
});

router.post('/:id/availabilities/type/set', function(req, res) {
    var date = req.body.dateId + " 00:00:00Z";

    models.Availability.update({
        type: req.body.value
    },
    {where: { Employeeid: req.params.id, day: date }}).then(employee => {
        res.send("maj!")
    });
});

module.exports = router;
