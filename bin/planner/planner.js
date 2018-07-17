var solver = require("javascript-lp-solver");
var models = require('../../models');

var Planner = function (params) {
    this.firstDate = params.firstDate;
    this.lastDate = params.lastDate;
    this.employees = params.employees;
    this.slots = params.slots,
    this.agendas = params.agendas;
    this.availabilities = params.availabilities;
    this.category = params.category;
    this.fullSlots = {};
};

Planner.prototype.findAgendas = function (date) {
    var agendas = [];

    for (var agenda of this.agendas) {
        if (agenda.day.getTime() == date.getTime()) {
            agendas.push(agenda);
        }
    }

    return agendas;
};

Planner.prototype.findSlots = function (date) {
    var slots = [];
    var day = date.getDay();

    for (var slot of this.slots) {
        if (slot.days.includes(day)) {
            slots.push(slot);
        }
    }

    return slots;
}

Planner.prototype.findMissingSlots = function (date, agendas) {
    var slots = this.findSlots(date);

    for (var agenda of agendas) {
        var slot = agenda.slot;

        var i = slots.length;
        while (i--) {
            if (slot.id == slots[i].id) {
                slots.splice(i, 1);
            }
        }
    }

    return slots;
};

Planner.prototype.findAvailabilities = function (date) {
    var availabilities = [];

    for (var availability of this.availabilities) {
        if (availability.day.getTime() == date.getTime()) {
            availabilities.push(availability);
        }
    }

    return availabilities;
}

Planner.prototype.buildModel = function () {
    var model = {
        optimize: {},
        constraints: {},
        variables: {},
        binaries: {}
    };

    var constraintsAgenda = {};

    for (var d = new Date(this.firstDate); d <= this.lastDate; d.setDate(d.getDate() + 1)) {
        var agendas = this.findAgendas(d);

        for (var agenda of agendas) {
            if(agenda.number) {
                constraintsAgenda[d.getTime() + '-' + agenda.slotId] = { equal: agenda.number };
            }
        }

        var missingSlots = this.findMissingSlots(d, agendas);
        for (var slot of missingSlots) {
            constraintsAgenda[d.getTime() + '-' + slot.id] = { equal: 0 };
        }
    }

    var variables = {}, constraintsAvailability = {};
    var optimizeMinTime = {}, optimizeSlot = {};

    for (var d = new Date(this.firstDate); d <= this.lastDate; d.setDate(d.getDate() + 1)) {
        var availabilities = this.findAvailabilities(d);

        for (var availability of availabilities) {
            var employeeId = availability.EmployeeId;

            var slotId = availability.slotId;
            if(availability.full) {
                slotId = 'f' + d.getTime();

                if(typeof this.fullSlots[slotId] === "undefined") {
                    this.fullSlots[slotId] = [availability.slotId];
                } else {
                    this.fullSlots[slotId].push(availability.slotId);
                }
            }

            var mainKey = employeeId + '-' + d.getTime() + '-' + slotId;
            var key = d.getTime() + '-' + availability.slotId;

            if(typeof variables[mainKey] === "undefined") {
                variables[mainKey] = {};
            }
            
            variables[mainKey][key] = 1;
            if(typeof variables[mainKey][employeeId] === "undefined") {
                variables[mainKey][employeeId] = 0;
            }
            variables[mainKey][employeeId]++;

            var subkey;
            switch (this.category.interval) {
                case "day":
                subkey = d.getTime();
                break;
                case "week":
                subkey = d.getWeek();
                break;
                case "month":
                subkey = d.getMonth();
                break;
            }

            if(typeof variables[mainKey][employeeId + '-' + subkey] === 'undefined') {
                variables[mainKey][employeeId + '-' + subkey] = 0;
            }
            variables[mainKey][employeeId + '-' + subkey] += availability.slot.getDuration();

            if(availability.Employee.number) {
                constraintsAvailability[employeeId + '-' + subkey] = { min: availability.Employee.number };
            }
            if(availability.mandatory) {
                variables[mainKey][employeeId + '-' + key] = 1;
                constraintsAvailability[mainKey] = { equal: 1 };
            }

            model.binaries[mainKey] = 1;
            optimizeMinTime[employeeId + '-' + subkey] = "min";
            optimizeSlot[employeeId] = "min";
        }
    }

    model.variables = shuffle(variables);
    model.constraints = Object.assign(
        shuffle(constraintsAgenda),
        shuffle(constraintsAvailability)
    );

    model.optimize = Object.assign(
        {},
        //shuffle(optimizeMinTime),
        //shuffle(optimizeSlot)
    );

    return model;
};

Planner.prototype.generate = function () {
    var model = this.buildModel();
    var results = solver.Solve(model);
    console.log("MODEL");
    console.log(model);
    //console.log("RESULTS");
    //console.log(results);
    //
    // var resultsbis = solver.MultiObjective(model);
    // console.log(resultsbis.midpoint.feasible);

    var planning = new models.Planning();

    planning.firstDate = this.firstDate;
    planning.lastDate = this.lastDate;
    planning.validated = false;
    planning.success = results.feasible;
    planning.presences = [];

    for (var key in results) {
        switch (key) {
            case 'feasible':
            case 'result':
            case 'bounded':
            break;
            default:
            var pattern = /^(\d+)-(\d+)-(f?\d+)$/;
            var match;

            if ((match = key.match(pattern)) && results[key] == 1) {
                var employeeId = match[1];
                var date = new Date(parseInt(match[2]));

                var slotId = match[3];
                if(slotId.match(/f/)) {
                    var slots = this.fullSlots[slotId];

                    for(var slot of slots) {
                        var presence = {
                            day: date,
                            slotId: slot,
                            EmployeeId: employeeId
                        }

                        planning.presences.push(presence);
                    }
                } else {
                    var presence = {
                        day: date,
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

Date.prototype.getWeek = function () {
    var date = new Date(this.getTime());
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() + 3 - (date.getDay() + 6) % 7);
    var week1 = new Date(date.getFullYear(), 0, 4);
    return 1 + Math.round(((date.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
};

function shuffle(object) {
    var objectArray = [];
    for (var i in object) {
        var subObject = {};
        subObject[i] = object[i];

        var randomIndex = Math.floor(Math.random() * (objectArray.length + 1));
        objectArray.splice(randomIndex, 0, subObject);
    }

    shuffleObject = {};

    for (var i in objectArray) {
        for (var j in objectArray[i]) {
            shuffleObject[j] = objectArray[i][j];
        }
    }

    return shuffleObject;
}


module.exports = Planner;
