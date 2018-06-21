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
        }).then(rawSlotTypes => {
            var promises = [];

            if(rawSlotTypes.length == 0) {
                promises.push(models.SlotType.findAll({
                    where: {
                        categoryId: null
                    }
                }).then(defaultSlotTypes => {
                    rawSlotTypes = defaultSlotTypes;
                }))
            }

            Promise.all(promises).then(values => {
                var slotTypes = {}

                for(var slotType of rawSlotTypes) {
                    for(var day of slotType.days) {
                        if(typeof slotTypes[day] === 'undefined') {
                            slotTypes[day] = [slotType];
                        } else {
                            slotTypes[day].push(slotType)
                        }
                    }
                }

                res.render('availability/list.ejs',
                {
                    employee: employee,
                    slotTypes: slotTypes,
                    firstDate: firstDate,
                    lastDate: lastDate
                });
            });
        })
    });
});

router.post('/:id/availabilities/enabled', function(req, res) {
    var employeeId = req.params.id;
    var date = req.body.dateId + " 00:00:00Z";
    var slotTypeId = req.body.slotTypeId;

    models.Availability.findOne({
        where: {
            EmployeeId: employeeId,
            day: date,
            slotTypeId: slotTypeId
        }
    }).then(availability => {
        res.send(availability !== null);
    })
});

router.post('/:id/availabilities/set', function(req, res) {
    var employeeId = req.params.id;
    var enable = req.body.enable == "true" ? true : false;
    var date = req.body.dateId + " 00:00:00Z";
    var slotTypeId = req.body.slotTypeId;

    if(enable) {

        models.Availability.findOrCreate({
            where: {
                EmployeeId: employeeId,
                day: date,
                slotTypeId: slotTypeId
            }, defaults: {
                EmployeeId: employeeId,
                day: date,
                slotTypeId: slotTypeId
            }
        })
        .spread((availability, created) => {
            res.send(true)
        });
    } else {
        models.Availability.destroy({ where: {
            EmployeeId: employeeId,
            day: date,
            slotTypeId: slotTypeId
        }}).then(status => {
            res.send(false)
        });
    }
});

router.get('/:id/availabilities/default', function(req, res) {
    var id = req.params.id;
    models.Employee.findById(id, {include: [{
        model: models.EmployeeCategory,
        as: 'category'
    }]}).then(employee => {
        models.SlotType.findAll({
            where: {
                categoryId: employee.category.id
            }
        }).then(rawSlotTypes => {
            var promises = [];

            if(rawSlotTypes.length == 0) {
                promises.push(models.SlotType.findAll({
                    where: {
                        categoryId: null
                    }
                }).then(defaultSlotTypes => {
                    rawSlotTypes = defaultSlotTypes;
                }))
            }

            Promise.all(promises).then(values => {
                var slotTypes = {}

                for(var slotType of rawSlotTypes) {
                    for(var day of slotType.days) {
                        if(typeof slotTypes[day] === 'undefined') {
                            slotTypes[day] = [slotType];
                        } else {
                            slotTypes[day].push(slotType)
                        }
                    }
                }

                res.render('availability/default.ejs',
                {
                    employee: employee,
                    slotTypes: slotTypes
                });
            });
        })
    });



    // models.Employee.findById(id).then(employee => {
    //     // models.SlotType.findAll({
    //     //     include: [
    //     //         {
    //     //             model: models.Employee,
    //     //             as: 'employeesDefault'
    //     //         }
    //     //     ]
    //     // }).then(rawSlotTypes => {
    //     //     var slotTypes = [];
    //     //     for(var slotType of rawSlotTypes) {
    //     //         if(slotType.employeesDefault.includes(id)) {
    //     //             slotTypes.push(slotType);
    //     //         }
    //     //     }
    //
    //     res.render('availability/default.ejs',
    //     {
    //         employee: employee
    //     });
    // });
    // });
});

router.post('/:id/availabilities/default/enabled', function(req, res) {
    var employeeId = req.params.id;
    var day = req.body.day;
    var slotTypeId = req.body.slotTypeId;

    models.DefaultAvailability.findOne({
        where: {
            EmployeeId: employeeId,
            day: day,
            slotTypeId: slotTypeId
        }
    }).then(availability => {
        res.send(availability !== null);
    })
});

router.post('/:id/availabilities/default/set', function(req, res) {
    var employeeId = req.params.id;
    var enable = req.body.enable == "true" ? true : false;
    var day = req.body.day;
    var slotTypeId = req.body.slotTypeId;

    if(enable) {
        models.DefaultAvailability.findOrCreate({
            where: {
                EmployeeId: employeeId,
                day: day,
                slotTypeId: slotTypeId
            }, defaults: {
                EmployeeId: employeeId,
                day: day,
                slotTypeId: slotTypeId
            }
        })
        .spread((availability, created) => {
            res.send(true)
        });
    } else {
        models.DefaultAvailability.destroy({ where: {
            EmployeeId: employeeId,
            day: day,
            slotTypeId: slotTypeId
        }}).then(status => {
            res.send(false)
        });
    }
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
