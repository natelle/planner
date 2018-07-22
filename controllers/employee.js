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
        categoryId: req.body.category,
        number: req.body.number,
        yearlyNumber: req.body.yearlyNumber
    }).then(employee => {
        res.redirect('/employee');
    });
});

router.get('/:id(\\d+)/update', function(req, res) {
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

router.post('/:id(\\d+)/update', function(req, res) {
    models.Employee.update({
        firstName: req.body.firstName,
        lastName: req.body.lastName,
        email: req.body.email,
        phone: req.body.phone,
        categoryId: req.body.category,
        number: req.body.number,
        yearlyNumber: req.body.yearlyNumber
    }, {where: { id: req.params.id }}).then(employee => {
        res.redirect('/employee');
    });
});

router.get('/:id(\\d+)/delete', function(req, res) {
    var id = req.params.id;

    models.Employee.destroy({
        where: { id: id }
    }).then(status => {
        res.redirect('/employee');
    });
});

module.exports = router;
