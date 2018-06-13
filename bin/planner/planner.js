var solver = require("javascript-lp-solver");
var xlsx = require("xlsx");

var Planner = function(params) {
    this.firstDate = params.firstDate;
    this.lastDate = params.lastDate;
    this.employees = params.employees;

    this.agendas = [];
    for(var i in params.agendas) {
        var agenda = params.agendas[i];

        // todo : change the way here : gettime is inexact
        if(agenda.day.getTime() >= this.firstDate.getTime() &&
        agenda.day.getTime() <= this.lastDate.getTime()) {
            this.agendas.push(agenda);
        }
    }

    this.availabilities = [];
    // todo : change the way here : gettime is inexact
    for(var i in params.availabilities) {
        var availability = params.availabilities[i];

        if(availability.day.getTime() >= this.firstDate.getTime() &&
        availability.day.getTime() <= this.lastDate.getTime()) {
            this.availabilities.push(availability);
        }
    }
};

Planner.prototype.findAgenda = function(date) {
    // todo : change the way here : gettime is inexact
    var agenda = null;

    for(var i in this.agendas) {
        if(this.agendas[i].day = date) {
            agenda = this.agendas[i];
            break;
        }
    }

    return agenda;
}

Planner.prototype.findAvailabilities = function(date) {
    // todo : change the way here : gettime is inexact
    var availabilities = [];
    console.log(this.availabilities.length);
    for(var i in this.availabilities) {
        console.log(this.availabilities[i].day.getDate() + " - " + date.getDate());
        if(this.availabilities[i].day.getTime() == date.getTime()) {
            availabilities.push(this.availabilities[i]);
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
            if(agenda.type == "time.all" || agenda.type == "time.morning") {
                model.constraints[d.getTime() + "morning"] = {equal: agenda.number};
            }
            if(agenda.type == "time.all" || agenda.type == "time.afternoon") {
                model.constraints[d.getTime() + "afternoon"] = {equal: agenda.number};
            }
            if(agenda.type == "time.closed") {
                model.constraints[d.getTime() + "afternoon"] = {equal: 0};
            }
        }
    }

    var variables = {};

    for(var i in this.employees) {
        var employee = this.employees[i];
        model.constraints[employee.id] = {"min": 14};  // TODO: add in employees' model
    }

    for (var d = new Date(this.firstDate); d <= this.lastDate; d.setDate(d.getDate() + 1)) {
        var availabilities = this.findAvailabilities(d);
        console.log(availabilities.length);

        for(var i in availabilities) {
            var availability = availabilities[i];
            var id = availability.Employeeid;
            var key;

            if(availability.type == "time.all" || availability.type == "time.morning") {
                key = d.getTime() + "morning";
            }
            if(availability.type == "time.all" || availability.type == "time.afternoon") {
                key = d.getTime() + "afternoon";
            }
            if(availability.type == "time.closed") {
                continue;
            }

            variables[id + key] = {};
            variables[id + key][key] = 1;
            variables[id + key][id] = 1;
            model.binaries[id + key] = 1;
        }
    }

    var variablesArray = [];
    for(var i in variables) {
        var variable = {};
        variable[i] = variables[i];

        var randomIndex = Math.floor(Math.random() * (variablesArray.length + 1));
        variablesArray.splice(randomIndex, 0, variable);
    }

    variables = {};

    for(var i in variablesArray) {
        for(var j in variablesArray[i]) {
            variables[j] = variablesArray[i][j];
        }
    }

    model.variables = variables;

    return model;
};

Planner.prototype.generate = function() {
    var model = this.buildModel();
    console.log(model);
    var results = solver.Solve(model);
    console.log(results);
    if(results.feasible) {
        // TODO: parse results
    }
};

module.exports = Planner;
//
// class Planning
// {
//     constructor(fromDate, toDate, nonWorkingDays = [0]) {
//         this.fromDate = fromDate;
//         this.toDate = toDate;
//         this.nonWorkingDays = nonWorkingDays
//         this.employees = [];
//         this.calendar = {};
//     }
//
//     buildModel() {
//         var model = {
//             optimize: {},
//             constraints: {},
//             variables: {},
//             binaries: {}
//         };
//
//         for (var d = new Date(this.firstDate.getTime()); d <= this.lastDate; d.setDate(d.getDate() + 1)) {
//             model.constraints[d.getFullYear() + '-' + (d.getMonth()+1) + '-' +  d.getDate()] =
//             (this.nonWorkingDays.includes(d.getDay()) ? {equal:0} : {min:1});
//         }
//
//         var variables = {};
//
//         for(var i in this.employees) {
//             var name = this.employees[i].name;
//             var constraints = this.employees[i].constraints;
//             var defaultValue = this.employees[i].default;
//             //model.optimize[name] = "min";
//             model.constraints[name] = {"min": 14};
//
//             for (var d = new Date(this.fromDate.getTime()); d <= this.toDate; d.setDate(d.getDate() + 1)) {
//                 var dateString = d.getFullYear() + '-' + (d.getMonth()+1) + '-' +  d.getDate();
//
//                 if(constraints[dateString]) {
//                     variables[name + "_" + dateString] = {};
//                     variables[name + "_" + dateString][dateString] = 1 ;
//                     variables[name + "_" + dateString][name] = 1 ;
//                     model.binaries[name + "_" + dateString] = 1;
//                 }
//             }
//
//
//
//         }
//
//         // Shuffle variables for better result
//         var variablesArray = [];
//         for(var i in variables) {
//             var variable = {};
//             variable[i] = variables[i];
//
//             var randomIndex = Math.floor(Math.random() * (variablesArray.length + 1));
//             variablesArray.splice(randomIndex, 0, variable);
//         }
//
//         variables = {};
//
//         for(var i in variablesArray) {
//             for(var j in variablesArray[i]) {
//                 variables[j] = variablesArray[i][j];
//             }
//         }
//
//         model.variables = variables;
//
//
//         return model;
//     }
//
//
//
//     create() {
//         var model = this.buildModel();
//
//         var results = solver.Solve(model);
//
//         if(results.feasible) {
//             for(var i in results) {
//                 switch(i) {
//                     case 'feasible':
//                     case 'result':
//                     case 'bounded':
//                     break;
//                     default:
//                     var name = i.replace(/_.+$/, '');
//                     var date = i.replace(/^.+_/, '');
//
//                     if(results[i] == 1) {
//                         if(typeof this.calendar[date] === 'undefined') {
//                             this.calendar[date] = [name]
//                         } else {
//                             this.calendar[date].push(name);
//                         }
//                     }
//                 }
//             }
//
//
//             // Sort the planning by date
//             var tempCalendar = {};
//             for (var d = new Date(this.fromDate.getTime()); d <= this.toDate; d.setDate(d.getDate() + 1)) {
//                 var dateString = d.getFullYear() + '-' + (d.getMonth()+1) + '-' +  d.getDate();
//
//                 for(var date in this.calendar) {
//                     if(date == dateString) {
//                         tempCalendar[date] = this.calendar[date];
//                     }
//                 }
//             }
//
//             this.calendar = tempCalendar;
//             return this.calendar;
//         } else {
//             return false;
//         }
//     }
//
//     exportXlsx() {
//         function Workbook() {
//             if(!(this instanceof Workbook)) return new Workbook();
//             this.SheetNames = [];
//             this.Sheets = {};
//         }
//
//         var wb = new Workbook(), ws = sheet_from_array_of_arrays(data);
//
//         /* add worksheet to workbook */
//         wb.SheetNames.push(ws_name);
//         wb.Sheets[ws_name] = ws;
//
//         /* write file */
//         XLSX.writeFile(wb, 'export.xlsx');
//     }
// }
//
// // X employees present the date D
// // employee E present at the date D
// // employee E present X time between D1 and D2
//
//
//
//
//
// // 4 présences sur deux mois
//
//
// var beginning = new Date();
//
// var planning = new Planning(new Date("2018-3-1"), new Date("2018-3-31"));
// // planning.addEmployee('marie', {'2018-3-3': false, '2018-3-10': false, '2018-3-17': false, '2018-3-24': false, '2018-3-31': false});
// // planning.addEmployee('jean', {'2018-3-2': false, '2018-3-9': false, '2018-3-16': false, '2018-3-23': false, '2018-3-30': false});
// // planning.addEmployee('bernard', {'2018-3-2': false, '2018-3-3': false, '2018-3-4': false, '2018-3-18': false, '2018-3-19': false});
// // planning.addEmployee('henriette', {'2018-3-10': false, '2018-3-14': false, '2018-3-16': false, '2018-3-19': false, '2018-3-22': false});
// // planning.addEmployee('jerome', {'2018-3-1': false, '2018-3-9': false, '2018-3-10': false, '2018-3-23': false, '2018-3-29': false});
//
//
// var employees = [
//     {
//         name: 'Jean',
//         constraints: {
//             '2018-3-1': true,
//             '2018-3-2': true,
//             '2018-3-3': true,
//             '2018-3-4': true,
//             '2018-3-5': false,
//             '2018-3-6': true,
//             '2018-3-7': true,
//             '2018-3-8': true,
//             '2018-3-9': true,
//             '2018-3-10': true,
//             '2018-3-11': false,
//             '2018-3-12': true,
//             '2018-3-13': true,
//             '2018-3-14': true,
//             '2018-3-15': true,
//             '2018-3-16': false,
//             '2018-3-17': true,
//             '2018-3-18': true,
//             '2018-3-19': false,
//             '2018-3-20': true,
//             '2018-3-21': true,
//             '2018-3-22': false,
//             '2018-3-23': true,
//             '2018-3-24': true,
//             '2018-3-25': true,
//             '2018-3-26': true,
//             '2018-3-27': true,
//             '2018-3-28': true,
//             '2018-3-29': false,
//             '2018-3-30': true,
//             '2018-3-31': false
//         }
//     },{
//         name: 'Marie',
//         constraints: {
//             '2018-3-1': false,
//             '2018-3-2': true,
//             '2018-3-3': true,
//             '2018-3-4': false,
//             '2018-3-5': true,
//             '2018-3-6': true,
//             '2018-3-7': true,
//             '2018-3-8': true,
//             '2018-3-9': true,
//             '2018-3-10': true,
//             '2018-3-11': true,
//             '2018-3-12': true,
//             '2018-3-13': false,
//             '2018-3-14': true,
//             '2018-3-15': true,
//             '2018-3-16': true,
//             '2018-3-17': false,
//             '2018-3-18': true,
//             '2018-3-19': true,
//             '2018-3-20': true,
//             '2018-3-21': true,
//             '2018-3-22': true,
//             '2018-3-23': false,
//             '2018-3-24': true,
//             '2018-3-25': true,
//             '2018-3-26': true,
//             '2018-3-27': true,
//             '2018-3-28': true,
//             '2018-3-29': true,
//             '2018-3-30': false,
//             '2018-3-31': true
//         }
//     }, {
//         name: 'Bernard',
//         constraints: {
//             '2018-3-1': false,
//             '2018-3-2': true,
//             '2018-3-3': true,
//             '2018-3-4': false,
//             '2018-3-5': true,
//             '2018-3-6': false,
//             '2018-3-7': true,
//             '2018-3-8': false,
//             '2018-3-9': false,
//             '2018-3-10': true,
//             '2018-3-11': true,
//             '2018-3-12': false,
//             '2018-3-13': true,
//             '2018-3-14': false,
//             '2018-3-15': true,
//             '2018-3-16': false,
//             '2018-3-17': false,
//             '2018-3-18': true,
//             '2018-3-19': true,
//             '2018-3-20': false,
//             '2018-3-21': true,
//             '2018-3-22': false,
//             '2018-3-23': true,
//             '2018-3-24': false,
//             '2018-3-25': false,
//             '2018-3-26': true,
//             '2018-3-27': true,
//             '2018-3-28': false,
//             '2018-3-29': true,
//             '2018-3-30': false,
//             '2018-3-31': true
//         }
//     }
// ];
//
//
//
//
//
// //planning.importXlsx('availabilities.xlsx');
// planning.setEmployees(employees);
//
// planning.create();
// console.log(planning.calendar);
//
// var end = new Date();
//
// console.log("Computed in " + (end - beginning) + ' ms');
