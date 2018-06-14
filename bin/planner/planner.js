var solver = require("javascript-lp-solver");
var xlsx = require("xlsx");
var models  = require('../../models');

var Planner = function(params) {
    this.firstDate = params.firstDate;
    this.lastDate = params.lastDate;
    this.employees = params.employees;
    

    this.agendas = [];
    for(var i in params.agendas) {
        var agenda = params.agendas[i];
        var dateString = agenda.day.getFullYear() + '-' + (agenda.day.getMonth()+1).toString().padStart(2, '0') + '-' + agenda.day.getDate().toString().padStart(2, '0') + ' 00:00:00';
        var date = new Date(dateString);
        // todo : change the way here : gettime is inexact
        if(date.getTime() >= this.firstDate.getTime() &&
        date.getTime() <= this.lastDate.getTime()) {
            this.agendas.push(agenda);
        }
    }

    this.availabilities = [];
    for(var i in params.availabilities) {
        var availability = params.availabilities[i];
        var dateString = availability.day.getFullYear() + '-' + (availability.day.getMonth()+1).toString().padStart(2, '0') + '-' + availability.day.getDate().toString().padStart(2, '0') + ' 00:00:00';
        var date = new Date(dateString);

        if(date.getTime() >= this.firstDate.getTime() &&
        date.getTime() <= this.lastDate.getTime()) {
            this.availabilities.push(availability);
        }
    }
};

Planner.prototype.findAgenda = function(date) {
    for(var i in this.agendas) {
        var agenda = this.agendas[i];
        var dateString = agenda.day.getFullYear() + '-' + (agenda.day.getMonth()+1).toString().padStart(2, '0') + '-' + agenda.day.getDate().toString().padStart(2, '0') + ' 00:00:00';
        var agendaDate = new Date(dateString);

        if(agendaDate.getTime() == date.getTime()) {
            return agenda;
        }
    }

    return null;
}

Planner.prototype.findAvailabilities = function(date) {
    var availabilities = [];

    for(var i in this.availabilities) {
        var availability = this.availabilities[i];
        var dateString = availability.day.getFullYear() + '-' + (availability.day.getMonth()+1).toString().padStart(2, '0') + '-' + availability.day.getDate().toString().padStart(2, '0') + ' 00:00:00';
        var availabilityDate = new Date(dateString);

        if(availabilityDate.getTime() == date.getTime()) {
            availabilities.push(availability);
        }
    }

    return availabilities;
}

Planner.prototype.buildModel = function() {
    var model = {
        optimize: {},
        constraints: {},
        variables: {},
        binaries: {}
    };

    for (var d = new Date(this.firstDate); d <= this.lastDate; d.setDate(d.getDate() + 1)) {
        var agenda = this.findAgenda(d);

        if(agenda) {
            if(agenda.type == "time.allday" || agenda.type == "time.morning") {
                model.constraints[d.getTime() + "morning"] = {equal: agenda.number};
            }
            if(agenda.type == "time.allday" || agenda.type == "time.afternoon") {
                model.constraints[d.getTime() + "afternoon"] = {equal: agenda.number};
            }
            if(agenda.type == "time.closed") {
                model.constraints[d.getTime() + "morning"] = {equal: 0};
                model.constraints[d.getTime() + "afternoon"] = {equal: 0};
            }
        }
    }

    var variables = {};

    for(var i in this.employees) {
        var employee = this.employees[i];

        model.constraints[employee.id] = {"min": (this.employees[i].defaultNumber * 2) };  // TODO: add in employees' model
    }

    for (var d = new Date(this.firstDate); d <= this.lastDate; d.setDate(d.getDate() + 1)) {
        var availabilities = this.findAvailabilities(d);

        for(var i in availabilities) {
            var availability = availabilities[i];
            var id = availability.EmployeeId;
            var key;

            if(availability.type == "time.allday" || availability.type == "time.morning") {
                key = d.getTime() + "morning";
                variables[id + '_' + key] = {};
                variables[id + '_' + key][key] = 1;
                variables[id + '_' + key][id] = 1;
                model.binaries[id + '_' + key] = 1;
            }
            if(availability.type == "time.allday" || availability.type == "time.afternoon") {
                key = d.getTime() + "afternoon";
                variables[id + '_' + key] = {};
                variables[id + '_' + key][key] = 1;
                variables[id + '_' + key][id] = 1;
                model.binaries[id + '_' + key] = 1;
            }
            if(availability.type == "time.closed") {
                continue;
            }


        }
    }

    // var variablesArray = [];
    // for(var i in variables) {
    //     var variable = {};
    //     variable[i] = variables[i];
    //
    //     var randomIndex = Math.floor(Math.random() * (variablesArray.length + 1));
    //     variablesArray.splice(randomIndex, 0, variable);
    // }
    //
    // variables = {};
    //
    // for(var i in variablesArray) {
    //     for(var j in variablesArray[i]) {
    //         variables[j] = variablesArray[i][j];
    //     }
    // }

    model.variables = variables;

    return model;
};

Planner.prototype.generate = function() {
    var model = this.buildModel();
    console.log(model);
    var results = solver.Solve(model);
    console.log(results);
    var plannings = [];

    if(results.feasible) {
        for(var key in results) {
            switch(key) {
                case 'feasible':
                case 'result':
                case 'bounded':
                    break;
                default:
                    var pattern = /^(\d+)_(\d+)(\w+)$/;
                    var match;

                    if((match = key.match(pattern))) {
                        var id = match[1];
                        var date = new Date(parseInt(match[2]));
                        var type = 'time.' + match[3];

                        var planning = new models.Planning();
                        planning.EmployeeId = id;
                        planning.day = date.getFullYear() + '-' + (date.getMonth()+1).toString().padStart(2, '0') + '-' + date.getDate().toString().padStart(2, '0') + ' 00:00:00';
                        planning.type = type;

                        plannings.push(planning);
                    }
            }
        }
    }

    return plannings;
};

module.exports = Planner;
