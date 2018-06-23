var models  = require('../models');
var express = require('express');
var router  = express.Router();

router.get('/', function(req, res) {
    var slotPromise = models.Slot.findAll({
        order: [
            ['begin', 'ASC'],
            ['name', 'ASC']
        ],
        include: [{
            model: models.EmployeeCategory,
            as: 'category'
        }]
    }).then(slotsRaw => {
        var slots = {};
        for(var i in slotsRaw) {
            var slot = slotsRaw[i];
            var category = slot.category;

            if(!category) {
                if(typeof slots['default'] === 'undefined') {
                    slots['default'] = [slot];
                } else {
                    slots['default'].push(slot);
                }
            } else {
                var categoryId = category.id
                if(typeof slots[categoryId] === 'undefined') {
                    slots[categoryId] = [slot];
                } else {
                    slots[categoryId].push(slot);
                }
            }
        }

        var ids = []
        for(var id in slots) {
            ids.push(id);
        }

        models.EmployeeCategory.findAll({
            where: {
                id: {[models.Sequelize.Op.in]: ids}
            }
        }).then(categoriesRaw => {
            var categories = {};

            for(var i in categoriesRaw) {
                categories[categoriesRaw[i].id] = categoriesRaw[i];
            }

            res.render('slot/list.ejs',
            {
                slots: slots,
                categories: categories
            });
        });
    });
});

router.get('/add', function(req, res) {
    models.EmployeeCategory.findAll({
        order: [
            ['name', 'ASC']
        ]
    }).then(categories => {
        res.render('slot/add.ejs',
        {
            categories: categories
        });
    });
});

router.post('/add', function(req, res) {
    models.Slot.create({
        name: req.body.name,
        begin: (req.body.begin !== '' ? req.body.begin : null),
        end: (req.body.end !== '' ? req.body.end : null),
        days: req.body.days,
        order: req.body.order,
        categoryId: req.body.category !== '0' ? req.body.category : null
    }).then(slot => {
        res.redirect('/company/slot');
    });
});

router.get('/:id(\\d+)/update', function(req, res) {
    var id = req.params.id;

    var slotPromise = models.Slot.findById(id, {
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

    Promise.all([slotPromise, categoriesPromise]).then(values => {
        res.render('slot/update.ejs',
        {
            slot: values[0],
            categories: values[1]
        });
    });
});

router.post('/:id(\\d+)/update', function(req, res) {
    var id = req.params.id;

    models.Slot.update({
        name: req.body.name,
        begin: (req.body.begin !== '' ? req.body.begin : null),
        end: (req.body.end !== '' ? req.body.end : null),
        days: req.body.days,
        order: req.body.order,
        categoryId: req.body.category !== '0' ? req.body.category : null
    }, {where: {id: id}}).then(status => {
        res.redirect('/company/slot');
    });
});

router.get('/:id(\\d+)/delete', function(req, res) {
    var id = req.params.id;

    models.Slot.destroy({
        where: { id: id }
    }).then(status => {
        res.redirect('/company/slot');
    });
});


module.exports = router;
