var models  = require('../models');
var express = require('express');
var router  = express.Router();

router.get('/', function(req, res) {
    var year = (new Date()).getFullYear();

    res.redirect('agenda/' + year);
});

router.get('/:year(\\d{4})', function(req, res) {
    var year = req.params.year;

    res.render('agenda/list-yearly.ejs',
    {
        year: year
    });
});

router.get('/:month(\\d{2}):year(\\d{4})', function(req, res) {
    var month = req.params.month;
    var year = req.params.year;

    var firstDate = new Date(year, parseInt(month) - 1, 1);
    var lastDate = new Date(year, parseInt(month), 0);

    var firstDateFormated = firstDate.getFullYear() + '-' + (firstDate.getMonth()+1).toString().padStart(2, '0') + '-' + firstDate.getDate().toString().padStart(2, '0') + ' 00:00:00Z';
    var lastDateFormated = lastDate.getFullYear() + '-' + (lastDate.getMonth()+1).toString().padStart(2, '0') + '-' + lastDate.getDate().toString().padStart(2, '0') + ' 00:00:00Z';

    var agendas = [];
    var promises = [];

    models.Company.findOne({where: {}}).then(company => {
        for(var d=firstDate; d<=lastDate; d.setDate(d.getDate() + 1)) {
            var date = d.getFullYear() + '-' + (d.getMonth()+1).toString().padStart(2, '0') + '-' + d.getDate().toString().padStart(2, '0') + ' 00:00:00Z';
            var key = "defaultDay" + d.getDay();
            var type = (company[key] !== null) ? company[key] : "time.allday";
            var number = (company.defaultNumber !== null) ? company.defaultNumber : 0;

            promises.push(models.Agenda.findOrCreate({
                where: { day: date },
                defaults: {
                    type: type,
                    number: number
                }}
            ).spread(function(agenda, created){
                agendas.push(agenda);
            }));
        }

        Promise.all(promises).then(values => {
            res.render('agenda/list.ejs',
            {
                agendas: agendas
            });
        });
    });
});

router.post('/type/set', function(req, res) {
    var date = req.body.dateId + " 00:00:00Z";

    models.Agenda.update({
        type: req.body.value
    },
    {where: { day: date }}).then(agenda => {
        res.send("type updated to " + req.body.value);
    });
});

router.post('/number/set', function(req, res) {
    var date = req.body.dateId + " 00:00:00Z";
    console.log("setting number");
    models.Agenda.update({
        number: req.body.value
    },
    {where: { day: date }}).then(agenda => {
        res.send("number updated to " + req.body.value);
    });
});

router.get('/:month(\\d{2}):year(\\d{4})/reset', function(req, res) {
    var month = req.params.month;
    var year = req.params.year;

    var firstDate = new Date(year, parseInt(month) - 1, 1);
    var lastDate = new Date(year, parseInt(month), 0);

    var firstDateFormated = firstDate.getFullYear() + '-' + (firstDate.getMonth()+1).toString().padStart(2, '0') + '-' + firstDate.getDate().toString().padStart(2, '0') + ' 00:00:00Z';
    var lastDateFormated = lastDate.getFullYear() + '-' + (lastDate.getMonth()+1).toString().padStart(2, '0') + '-' + lastDate.getDate().toString().padStart(2, '0') + ' 00:00:00Z';

    var promises = [];

    for(var d=firstDate; d<=lastDate; d.setDate(d.getDate() + 1)) {
        var date = d.getFullYear() + '-' + (d.getMonth()+1).toString().padStart(2, '0') + '-' + d.getDate().toString().padStart(2, '0') + ' 00:00:00Z';

        promises.push(models.Agenda.destroy({
            where: { day: date }
        }));
    }

    Promise.all(promises).then(values => {
        res.redirect('/agenda/' + month + year);
    });
});


module.exports = router;
