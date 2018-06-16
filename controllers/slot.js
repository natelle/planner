var models  = require('../models');
var express = require('express');
var router  = express.Router();

router.get('/', function(req, res) {
    models.SlotType.findAll({
        order: [
            ['order', 'ASC'],
            ['name', 'ASC']
        ],
        include: [{
            model: models.EmployeeCategory,
            as: 'categories'
        }]
    }).then(slotTypesRaw => {
        var slotTypes = {};

        for(var i in slotTypesRaw) {
            var slotType = slotTypesRaw[i];
            var categories = slotType.categories;

            if(categories.length == 0) {
                if(typeof slotTypes['all'] === 'undefined') {
                    slotTypes['all'] = [slotType];
                } else {
                    slotTypes['all'].push(slotType);
                }
            } else {
                for(var j in categories) {
                    var category = categories[j];
                    
                    if(typeof slotTypes[category] === 'undefined') {
                        slotTypes[category] = [slotType];
                    } else {
                        slotTypes[category].push(slotType);
                    }
                }
            }
        }

        res.render('slottype/list.ejs',
        {
            slotTypes: slotTypes
        });
    });
});

module.exports = router;
