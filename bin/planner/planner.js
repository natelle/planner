var solver = require("javascript-lp-solver");
const spawn = require('threads').spawn;
var models = require('../../models');

var Planner = function (params) {
    this.firstDate = params.firstDate;
    this.lastDate = params.lastDate;
    this.employees = params.employees;

    this.employeesById = {};
    for(var employee of this.employees) {
        this.employeesById[employee.id] = employee;
    }

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

Planner.prototype.getTotalAgendaTime = function () {
    var total = 0;

    for (var d = new Date(this.firstDate); d <= this.lastDate; d.setDate(d.getDate() + 1)) {
        var agendas = this.findAgendas(d);

        for (var agenda of agendas) {
            total += agenda.slot.getDuration();
        }
    }

    return total;
};

Planner.prototype.getTotalEmployees = function (hasNumber) {
    hasNumber = (typeof hasNumber !== 'undefined') ? hasNumber : true;

    var employees = {};
    for (var availability of this.availabilities) {
        if (!hasNumber || (typeof availability.Employee.currentNumber !== 'undefined') || availability.Employee.number) {
            if (typeof employees[availability.Employee.id] === 'undefined') {
                employees[availability.Employee.id] = this.employeesById[availability.Employee.id];
            }
        }
    }

    return Object.values(employees);
};

Planner.prototype.buildModel = function () {
    var model = {
        optimize: {},
        constraints: {},
        variables: {},
        binaries: {}
    };

    this.fullSlots = {};

    var constraintsAgenda = {};

    for (var d = new Date(this.firstDate); d <= this.lastDate; d.setDate(d.getDate() + 1)) {
        var agendas = this.findAgendas(d);

        for (var agenda of agendas) {
            if (agenda.number) {
                constraintsAgenda[d.getTime() + '-' + agenda.slotId] = { equal: agenda.number };
            }
        }

        var missingSlots = this.findMissingSlots(d, agendas);
        for (var slot of missingSlots) {
            constraintsAgenda[d.getTime() + '-' + slot.id] = { equal: 0 };
        }
    }

    var variables = {}, constraintsAvailability = {};

    for (var d = new Date(this.firstDate); d <= this.lastDate; d.setDate(d.getDate() + 1)) {
        var availabilities = this.findAvailabilities(d);

        for (var availability of availabilities) {
            var employeeId = availability.EmployeeId;

            var slotId = availability.slotId;
            if (availability.full) {
                slotId = 'f' + d.getTime();

                if (typeof this.fullSlots[slotId] === "undefined") {
                    this.fullSlots[slotId] = [availability.slotId];
                } else {
                    this.fullSlots[slotId].push(availability.slotId);
                }
            }

            var mainKey = employeeId + '-' + d.getTime() + '-' + slotId;
            var key = d.getTime() + '-' + availability.slotId;

            if (typeof variables[mainKey] === "undefined") {
                variables[mainKey] = {};
            }

            variables[mainKey][key] = 1;
            if (typeof variables[mainKey][employeeId] === "undefined") {
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

            if (typeof variables[mainKey][employeeId + '-' + subkey] === 'undefined') {
                variables[mainKey][employeeId + '-' + subkey] = 0;
            }
            variables[mainKey][employeeId + '-' + subkey] += availability.slot.getDuration();

            // todo: use employees var instead of availability.Employee
            if(typeof this.employeesById[availability.Employee.id].currentNumber !== 'undefined') {
                constraintsAvailability[employeeId + '-' + subkey] = { min: this.employeesById[availability.Employee.id].currentNumber };
            } else if (availability.Employee.number) {
                constraintsAvailability[employeeId + '-' + subkey] = { min: availability.Employee.number };
            }
            if (availability.mandatory) {
                variables[mainKey][employeeId + '-' + key] = 1;
                constraintsAvailability[mainKey] = { equal: 1 };
            }

            model.binaries[mainKey] = 1;
        }
    }

    model.variables = shuffle(variables);
    model.constraints = Object.assign(
        shuffle(constraintsAgenda),
        shuffle(constraintsAvailability)
    );

    return model;
};

function timeout(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

Planner.prototype.generateRaw = async function () {
    var model = this.buildModel();
    // console.log("MODEL");
    // console.log(model.constraints);
    const thread = spawn(function (model, done) {
        var solver = require("javascript-lp-solver");

        var results = solver.Solve(model);

        done({ results: results });
    });

    var results = null

    thread
        .send(model)
        .on('message', function (response) {
            results = response.results;

            thread.kill();
        });


    await timeout(1000);
    
    if (results == null) {
        thread.kill();
    }

    var planning = new models.Planning();

    planning.firstDate = this.firstDate;
    planning.lastDate = this.lastDate;
    planning.validated = false;
    planning.success = results ? results.feasible : false;
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
                    if (slotId.match(/f/)) {
                        var slots = this.fullSlots[slotId];

                        for (var slot of slots) {
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

Planner.prototype.generate = async function () {
    var planning = await this.generateRaw();

    if (planning.success) {
        var totalAgenda = this.getTotalAgendaTime();
        var employees = this.getTotalEmployees();

        var realNumbers = {};
        for (var employee of employees) {
            var presences = planning.presences.filter(p => p.EmployeeId == employee.id);
            var duration = 0;

            for (var presence of presences) {
                var slot = this.slots.find(slot => slot.id == presence.slotId);
                duration += slot.getDuration();
            }

            realNumbers[employee.id] = duration;
        }

        var theoreticalAvg = employees.map(e => e.number).reduce((a, b) => a + b) / employees.length;
        var realAvg = Object.values(realNumbers).reduce((a, b) => a + b) / employees.length;

        var theoreticalNumbers = {};
        for (var employee of employees) {
            theoreticalNumbers[employee.id] = employee.number;
        }

        var idealNumbers = {};
        for (var employee of employees) {
            idealNumbers[employee.id] = (employee.number * realAvg) / theoreticalAvg;
        }

        var idealDiff = {};
        for (var employeeId in idealNumbers) {
            idealDiff[employeeId] = idealNumbers[employeeId] - theoreticalNumbers[employeeId];
        }

        var value = 0.5, valueMin = 0, valueMax = 1, balancedPlanning = {}, successPlanning = null;
        balancedPlanning.success = false;

        for(var i=0; i<4; i++) {
            for (var employeeId in idealDiff) {
                for (var availability of this.availabilities) {
                    if (availability.EmployeeId == employeeId) {
                        availability.Employee.number = theoreticalNumbers[employeeId] + value * idealDiff[employeeId];
                    }
                }
            }

            balancedPlanning = await this.generateRaw();
            console.log('i = ' + i + ' - value = ' + value + ' - success = ' + balancedPlanning.success);
            if(balancedPlanning.success) {
                successPlanning = balancedPlanning;

                if(value == 1) {
                    break;
                } else {
                    valueMin = value;
                    value = (value + valueMax) / 2;
                }
            } else {
                valueMax = value;
                value = (value + valueMin) / 2;
                
            }
        }
        
        if (successPlanning) {
            console.log('returning success');
            return successPlanning;
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
