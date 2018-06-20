var models  = require('../models');
var express = require('express');
var router  = express.Router();

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
    console.log("ok");
    var id = req.params.id;
    var month = req.params.month;
    var year = req.params.year;

    var firstDate = new Date(year, parseInt(month) - 1, 1);
    var lastDate = new Date(year, parseInt(month), 0);

    var firstDateFormated = firstDate.getFullYear() + '-' + (firstDate.getMonth()+1).toString().padStart(2, '0') + '-' + firstDate.getDate().toString().padStart(2, '0') + ' 00:00:00Z';
    var lastDateFormated = lastDate.getFullYear() + '-' + (lastDate.getMonth()+1).toString().padStart(2, '0') + '-' + lastDate.getDate().toString().padStart(2, '0') + ' 00:00:00Z';

    models.Employee.findById(id, {include: [{
        model: models.EmployeeCategory,
        as: 'category'
    }]}).then(employee => {
        models.SlotType.findAll({
            where: {
                categoryId: employee.category.id
            }
        }).then(st => {
            var promises = [];
            var slotTypes = st;

            if(slotTypes.length = 0) {
                promises.push(models.SlotType.findAll({
                    where: {
                        categoryId: null
                    }
                }).then(st => {
                    slotTypes = st;
                }))
            }
            console.log(slotTypes.length);
            Promise.all(promises).then(values => {
                console.log(slotTypes.length);

                res.render('availability/list.ejs',
                {
                    employee: employee,
                    slotTypes: slotTypes
                });
            });
        })
        // var availabilities = [];
        // var promises = [];
        //
        // for(var d=firstDate; d<=lastDate; d.setDate(d.getDate() + 1)) {
        //     var date = d.getFullYear() + '-' + (d.getMonth()+1).toString().padStart(2, '0') + '-' + d.getDate().toString().padStart(2, '0') + ' 00:00:00Z';
        //     var key = "defaultDay" + d.getDay();
        //     var type = (employee[key] !== null) ? employee[key] : "time.allday";
        //
        //     promises.push(models.Availability.findOrCreate({
        //         where: { Employeeid: req.params.id, day: date },
        //         defaults: {
        //             Employeeid: req.params.id,
        //             type: type,
        //         }}
        //     ).spread(function(availability, created){
        //         if (created){
        //             availability.setEmployee(employee);
        //         }
        //
        //         availabilities.push(availability);
        //     }));
        // }

        //Promise.all(promises).then(values => {

        //});
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
