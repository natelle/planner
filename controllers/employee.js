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
        res.end(employee.firstName + " " + employee.lastName + " created");
    });
});

router.get('/:id/update', function(req, res) {
    var id = req.params.id;

    models.Employee.findById(id).then(employee => {
        console.log(JSON.stringify(employee));
        res.render('employee/update.ejs', {employee: employee});
    });
});

router.post('/:id/update', function(req, res) {
    models.Employee.update({
        firstName: req.body.firstName,
        lastName: req.body.lastName,
        category: req.body.category
    }, {where: { id: req.params.id }}).then(employee => {
        // let's assume the default of isAdmin is false:
        res.end(employee.firstName + " " + employee.lastName + " updated");
    });
});

router.get('/:id/presences/set/:month(\\d{2}):year(\\d{4})', function(req, res) {
    //find or create must be where

    var id = req.params.id;
    var month = req.params.month;
    var year = req.params.year;

    var firstDate = new Date(year, parseInt(month) - 1, 1);
    var lastDate = new Date(year, parseInt(month), 0);

    var firstDateFormated = firstDate.getFullYear() + '-' + (firstDate.getMonth()+1).toString().padStart(2, '0') + '-' + firstDate.getDate().toString().padStart(2, '0') + ' 00:00:00Z';
    var lastDateFormated = lastDate.getFullYear() + '-' + (lastDate.getMonth()+1).toString().padStart(2, '0') + '-' + lastDate.getDate().toString().padStart(2, '0') + ' 00:00:00Z';

    models.Employee.findById(id).then(employee => {
        var possibilities = [];
        var promises = [];

        for(var d=firstDate; d<=lastDate; d.setDate(d.getDate() + 1)) {
            var date = d.getFullYear() + '-' + (d.getMonth()+1).toString().padStart(2, '0') + '-' + d.getDate().toString().padStart(2, '0') + ' 00:00:00Z';

            promises.push(models.EmployeePossibility.findOrCreate(
                {
                    where: { Employeeid: req.params.id, day: date },
                    defaults: {
                        Employeeid: req.params.id,
                        type: 'all',
                        presence: true,
                    }}
                ).spread(function(employeepossibility, created){
                    if (created){
                        employeepossibility.setEmployee(employee);
                    }

                    possibilities.push(employeepossibility);
                }));
            }

            Promise.all(promises).then(values => {
                res.render('employee/set-possibilities.ejs', {
                    employee: employee,
                    possibilities: possibilities});
                });
            });
        });


        // models.Employee.findById(id).then(employee => {
        //     console.log(JSON.stringify(employee));
        //
        //     res.render('employee/set-possibilities.ejs', {
        //         employee: employee,
        //         firstDate: firstDate,
        //         lastDate: lastDate});
        //     });
        

        router.post('/:id/presences/set', function(req, res) {
            var id = req.params.id;
            var presences = req.body.presences;

            models.Employee.findById(id).then(employee => {
                for(var date in presences) {
                    var d = date;

                    models.EmployeePossibility.findOrCreate(
                        {
                            where: { Employeeid: req.params.id, day: date + " 00:00:00Z" },
                            defaults: {
                                Employeeid: req.params.id,
                                type: presences[date].type,
                                presence: presences[date].presence,
                            }}
                        ).spread(function(employeepossibility, created){
                            // this userId was either created or found depending upon whether the argment 'created' is true or false
                            // do something with this user now
                            if (created){
                                employeepossibility.setEmployee(employee);
                            }
                        });
                    }

                });

                res.send("bien joué!")
            });

            router.post('/:id/presences/type/set', function(req, res) {
                var date = req.body.dateId + " 00:00:00Z";

                models.EmployeePossibility.update(
                    {type: req.body.value},
                    {where: { Employeeid: req.params.id, day: date }}).then(employee => {
                        res.send("maj!")
                    });
                });

                router.post('/:id/presences/presence/set', function(req, res) {
                    var date = req.body.dateId + " 00:00:00Z";

                    models.EmployeePossibility.update(
                        {presence: req.body.value},
                        {where: { Employeeid: req.params.id, day: date }}).then(employee => {
                            res.send("maj!")
                        });
                    });

                    router.get('/:id/possibility/add', function(req, res) {
                        var id = req.params.id;

                        models.Employee.findById(id).then(employee => {
                            console.log(JSON.stringify(employee));


                            res.render('employee/add-possibility.ejs', {employee: employee});
                        });
                    });

                    router.post('/:id/possibility/add', function(req, res) {
                        var id = req.params.id;

                        models.EmployeePossibility.create({
                            EmployeeId: id,
                            day: req.body.day,
                            type: req.body.type,
                            presence: req.body.presence === 'yes' ? true : false,
                        }).then(possibility => {
                            // todo

                        });
                    });


                    module.exports = router;
