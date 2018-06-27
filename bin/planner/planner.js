var solver = require("javascript-lp-solver");
var models  = require('../../models');

var Planner = function(params) {
    this.firstDate = params.firstDate;
    this.lastDate = params.lastDate;
    this.employees = params.employees;
    this.slots = params.slots,
    this.agendas = params.agendas;
    this.availabilities = params.availabilities;
};

Planner.prototype.findAgendas = function(date) {
    var agendas = [];

    for(var agenda of this.agendas) {
        var dateString = agenda.day.getFullYear() + '-' + (agenda.day.getMonth()+1).toString().padStart(2, '0') + '-' + agenda.day.getDate().toString().padStart(2, '0') + ' 00:00:00';
        var agendaDate = new Date(dateString);

        if(agendaDate.getTime() == date.getTime()) {
            agendas.push(agenda);
        }
    }

    return agendas;
};

Planner.prototype.findSlots = function(date) {
    var slots = [];
    var day = date.getDay();

    for(var slot of this.slots) {
        if(slot.days.includes(day)) {
            slots.push(slot);
        }
    }

    return slots;
}

Planner.prototype.findMissingSlots = function(date, agendas) {
    var slots = this.findSlots(date);

    for(var agenda of agendas) {
        var slot = agenda.slot;

        var i = slots.length;
        while(i--) {
            if(slot.id == slots[i].id) {
                slots.splice(i, 1);
            }
        }
    }

    return slots;
};

Planner.prototype.findAvailabilities = function(date) {
    var availabilities = [];

    for(var availability of this.availabilities) {
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
        var agendas = this.findAgendas(d);

        for(var agenda of agendas) {
            model.constraints[d.getTime() + '-' + agenda.slotId] = {equal: agenda.number};
        }

        var missingSlots = this.findMissingSlots(d, agendas);
        for(var slot of missingSlots) {
            model.constraints[d.getTime() + '-' + slot.id] = {equal: 0};
        }
    }

    var variables = {};

    // // TODO
    //
    // for(var i in this.employees) {
    //     var employee = this.employees[i];
    //
    //     model.constraints[employee.id] = {"min": (this.employees[i].defaultNumber * 2) };  // TODO: add in employees' model
    // }

    for (var d = new Date(this.firstDate); d <= this.lastDate; d.setDate(d.getDate() + 1)) {
        var availabilities = this.findAvailabilities(d);

        for(var availability of availabilities) {
            var employeeId = availability.EmployeeId;
            var key = d.getTime() + "-" + availability.slotId;
            variables[employeeId + '-' + key] = {};
            variables[employeeId + '-' + key][key] = 1;
            variables[employeeId + '-' + key][employeeId] = 1;
            //model.constraints[key] = {max: 1};
            // TODO: add something like variables[employeeId + '-' + key][time + '-' + employeeId] = difference (to add in Models.Availability);
            // TODO: it means time variable might be added for agendas too
            model.binaries[employeeId + '-' + key] = 1;
        }
    }



    // // Shuffling
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
    //
    model.variables = variables;

    return model;
};

Planner.prototype.generate = function() {
    var model = this.buildModel();
    var results = solver.Solve(model);
    console.log("RESULTS");
    console.log(results);

    var planning = null;

    if(results.feasible) {
        planning = new models.Planning();

        planning.firstDate = this.firstDate.getFullYear() + '-' + (this.firstDate.getMonth()+1).toString().padStart(2, '0') + '-' + this.firstDate.getDate().toString().padStart(2, '0') + ' 00:00:00Z';
        planning.lastDate = this.lastDate.getFullYear() + '-' + (this.lastDate.getMonth()+1).toString().padStart(2, '0') + '-' + this.lastDate.getDate().toString().padStart(2, '0') + ' 00:00:00Z';
        planning.validated = false;
        planning.presences = [];

        for(var key in results) {
            switch(key) {
                case 'feasible':
                case 'result':
                case 'bounded':
                    break;
                default:
                    var pattern = /^(\d+)-(\d+)-(\d+)$/;
                    var match;

                    if((match = key.match(pattern))) {
                        var employeeId = match[1];
                        var date = new Date(parseInt(match[2]));
                        var slotId = match[3];

                        // var presence = new models.Availability();
                        // presence.day = date.getFullYear() + '-' + (date.getMonth()+1).toString().padStart(2, '0') + '-' + date.getDate().toString().padStart(2, '0') + ' 00:00:00Z';
                        // presence.slotId = slotId;
                        // presence.EmployeeId = employeeId;
                        var presence = {
                            day: date.getFullYear() + '-' + (date.getMonth()+1).toString().padStart(2, '0') + '-' + date.getDate().toString().padStart(2, '0') + ' 00:00:00Z',
                            slotId: slotId,
                            EmployeeId: employeeId
                        }

                        planning.presences.push(presence);
                    }
            }
        }
    }

    return planning;
};

module.exports = Planner;
