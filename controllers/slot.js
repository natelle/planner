var models  = require('../models');
var express = require('express');
var router  = express.Router();

router.get('/', function(req, res) {
    var slotTypePromise = models.SlotType.findAll({
        order: [
            ['order', 'ASC'],
            ['name', 'ASC']
        ],
        include: [{
            model: models.EmployeeCategory,
            as: 'categories'
        }]
    });

    var categoriesPromise = models.EmployeeCategory.count();

    Promise.all([slotTypePromise, categoriesPromise]).then(values => {
        var slotTypesRaw = values[0];
        var count = values[1];

        var slotTypes = {};
        for(var i in slotTypesRaw) {
            var slotType = slotTypesRaw[i];
            var categories = slotType.categories;

            if(categories.length == 0 || categories.length == count ) {
                if(typeof slotTypes['all'] === 'undefined') {
                    slotTypes['all'] = [slotType];
                } else {
                    slotTypes['all'].push(slotType);
                }
            } else {
                for(var j in categories) {
                    var categoryId = categories[j].id
                    if(typeof slotTypes[categoryId] === 'undefined') {
                        slotTypes[categoryId] = [slotType];
                    } else {
                        slotTypes[categoryId].push(slotType);
                    }
                }
            }
        }

        var ids = []
        for(var id in slotTypes) {
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

            res.render('slottype/list.ejs',
            {
                slotTypes: slotTypes,
                categories: categories
            });
        });
    });
});

router.get('/add', function(req, res) {
    var categoriesPromise = models.EmployeeCategory.findAll({
        order: [
            ['name', 'ASC']
        ]
    });

    Promise.all([categoriesPromise]).then(values => {
        res.render('slottype/add.ejs',
        {
            categories: values[0]
        });
    });
});

router.post('/add', function(req, res) {
    models.SlotType.create({
        name: req.body.name,
        begin: (req.body.begin !== '' ? req.body.begin : null),
        end: (req.body.end !== '' ? req.body.end : null),
        days: req.body.days,
        order: req.body.order
    }).then(slotType => {
        var promises = [];
        for(var i in req.body.categories) {
            promises.push(models.EmployeeCategory.findById(req.body.categories[i]));
        }

        Promise.all(promises).then(categories => {
            slotType.setCategories(categories).then(() => {
                res.redirect('/company/slot');
            });
        });
    });
});

router.get('/:id/update', function(req, res) {
    var id = req.params.id;

    var slotTypePromise = models.SlotType.findById(id, {
        include: [{
            model: models.EmployeeCategory,
            as: 'categories'
        }]
    });



    var categoriesPromise = models.EmployeeCategory.findAll({
        order: [
            ['name', 'ASC']
        ]
    });

    Promise.all([slotTypePromise, categoriesPromise]).then(values => {
        var categoriesId = [];
        for(var i in values[0].categories) {
            categoriesId.push(values[0].categories[i].id)
        }

        res.render('slottype/update.ejs',
        {
            slotType: values[0],
            categoriesId: categoriesId,
            categories: values[1]
        });
    });
});

router.post('/:id/update', function(req, res) {
    var id = req.params.id;

    models.SlotType.update({
        name: req.body.name,
        begin: (req.body.begin !== '' ? req.body.begin : null),
        end: (req.body.end !== '' ? req.body.end : null),
        days: req.body.days,
        order: req.body.order
    }, {where: {id: id}}).then(status => {
        models.SlotType.findById(id).then(slotType => {
            var promises = [];
            for(var i in req.body.categories) {
                promises.push(models.EmployeeCategory.findById(req.body.categories[i]));
            }

            Promise.all(promises).then(categories => {
                slotType.setCategories(categories).then(() => {
                    res.redirect('/company/slot');
                });
            });
        });
    });
});

router.get('/:id/delete', function(req, res) {
    var id = req.params.id;

    models.SlotType.destroy({
        where: { id: id }
    }).then(status => {
        res.redirect('/company/slot');
    });
});



module.exports = router;
