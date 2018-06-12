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

    for(var d=firstDate; d<=lastDate; d.setDate(d.getDate() + 1)) {
        var date = d.getFullYear() + '-' + (d.getMonth()+1).toString().padStart(2, '0') + '-' + d.getDate().toString().padStart(2, '0') + ' 00:00:00Z';

        promises.push(models.Agenda.findOrCreate({
            where: { day: date },
            defaults: {
                type: 'time.allday'
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

router.post('/type/set', function(req, res) {
    var date = req.body.dateId + " 00:00:00Z";

    models.Agenda.update({
        type: req.body.value
    },
    {where: { day: date }}).then(agenda => {
        res.send("maj!")
    });
});

module.exports = router;