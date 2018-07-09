var models = require('../models');
var express = require('express');
var router = express.Router();

router.get('/', function (req, res) {
    models.EmployeeCategory.findAll({
        order: [
            ['name', 'ASC']
        ]
    }).then(categories => {
        res.render('category/list.ejs',
            {
                categories: categories
            });
    });
});

router.get('/add', function (req, res) {
    res.render('category/add.ejs');
});

router.post('/add', function (req, res) {
    models.EmployeeCategory.create({
        name: req.body.name,
        interval: req.body.interval
    }).then(category => {
        res.redirect('/employee/category');
    });
});

router.get('/:id(\\d+)/update', function (req, res) {
    var id = req.params.id;

    models.EmployeeCategory.findById(id).then(category => {
        res.render('category/update.ejs', {
            category: category
        });
    });
});

router.post('/:id(\\d+)/update', function (req, res) {
    models.EmployeeCategory.update(
        {
            name: req.body.name,
            interval: req.body.interval
        },
        {
            where: {
                id: req.params.id
            }
        }).then(category => {
            res.redirect('/employee/category');
        });
});

router.get('/:id(\\d+)/delete', function (req, res) {
    var id = req.params.id;

    models.EmployeeCategory.destroy({
        where: { id: id }
    }).then(status => {
        res.redirect('/employee/category');
    });
});
















router.get('/:id(\\d+)/availabilities', function (req, res) {
    var id = req.params.id;
    var year = (new Date()).getFullYear();

    res.redirect('/employee/' + id + '/availabilities/' + year);
});

router.get('/:id(\\d+)/availabilities/:year(\\d{4})', function (req, res) {
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

router.get('/:id(\\d+)/availabilities/:month(\\d{2}):year(\\d{4})', function (req, res) {
    var id = req.params.id;
    var month = req.params.month;
    var year = req.params.year;

    var firstDate = new Date(year, parseInt(month) - 1, 1);
    var lastDate = new Date(year, parseInt(month), 0);

    var firstDateFormated = firstDate.getFullYear() + '-' + (firstDate.getMonth() + 1).toString().padStart(2, '0') + '-' + firstDate.getDate().toString().padStart(2, '0') + ' 00:00:00Z';
    var lastDateFormated = lastDate.getFullYear() + '-' + (lastDate.getMonth() + 1).toString().padStart(2, '0') + '-' + lastDate.getDate().toString().padStart(2, '0') + ' 00:00:00Z';

    models.Employee.findById(id).then(employee => {
        var availabilities = [];
        var promises = [];

        for (var d = firstDate; d <= lastDate; d.setDate(d.getDate() + 1)) {
            var date = d.getFullYear() + '-' + (d.getMonth() + 1).toString().padStart(2, '0') + '-' + d.getDate().toString().padStart(2, '0') + ' 00:00:00Z';
            var key = "defaultDay" + d.getDay();
            var type = (employee[key] !== null) ? employee[key] : "time.allday";

            promises.push(models.Availability.findOrCreate({
                where: { Employeeid: req.params.id, day: date },
                defaults: {
                    Employeeid: req.params.id,
                    type: type,
                }
            }
            ).spread(function (availability, created) {
                if (created) {
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

router.get('/:id(\\d+)/availabilities/:month(\\d{2}):year(\\d{4})/reset', function (req, res) {
    var id = req.params.id;
    var month = req.params.month;
    var year = req.params.year;

    var firstDate = new Date(year, parseInt(month) - 1, 1);
    var lastDate = new Date(year, parseInt(month), 0);

    var firstDateFormated = firstDate.getFullYear() + '-' + (firstDate.getMonth() + 1).toString().padStart(2, '0') + '-' + firstDate.getDate().toString().padStart(2, '0') + ' 00:00:00Z';
    var lastDateFormated = lastDate.getFullYear() + '-' + (lastDate.getMonth() + 1).toString().padStart(2, '0') + '-' + lastDate.getDate().toString().padStart(2, '0') + ' 00:00:00Z';

    var promises = [];

    for (var d = firstDate; d <= lastDate; d.setDate(d.getDate() + 1)) {
        var date = d.getFullYear() + '-' + (d.getMonth() + 1).toString().padStart(2, '0') + '-' + d.getDate().toString().padStart(2, '0') + ' 00:00:00Z';

        promises.push(models.Availability.destroy({
            where: { Employeeid: req.params.id, day: date }
        }));
    }

    Promise.all(promises).then(values => {
        res.redirect('/employee/' + id + '/availabilities/' + month + year);
    });
});

router.post('/:id(\\d+)/availabilities/type/set', function (req, res) {
    var date = req.body.dateId + " 00:00:00Z";

    models.Availability.update({
        type: req.body.value
    },
        { where: { Employeeid: req.params.id, day: date } }).then(employee => {
            res.send("maj!")
        });
});

module.exports = router;
