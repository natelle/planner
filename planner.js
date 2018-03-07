var solver = require("javascript-lp-solver");
var xlsx = require("xlsx");

var Employee = require("./Employee.js");
var Constraint = require("./Constraint.js");
var utils = require("./Utils.js");


class Planning
{
    constructor(fromDate, toDate, nonWorkingDays = [0]) {
        this.fromDate = fromDate;
        this.toDate = toDate;
        this.nonWorkingDays = nonWorkingDays
        this.employees = [];
        this.calendar = {};
    }

    addEmployee(name, constraints, defaultValue = true) {
        if(!this.hasEmployee(name)) {
            this.employees.push({
                name: name,
                constraints: constraints,
                default: defaultValue
            })
        }
    }

    hasEmployee(name) {
        for(var i in this.employees) {
            if(this.employees[i].name === name) {
                return true;
            }
        }

        return false;
    }

    importXlsx(filename) {
        var workbook = xlsx.readFile(filename, {'cellDates': true});
        var sheet_name_list = workbook.SheetNames;

        var employees = {};

        sheet_name_list.forEach(function(y) {
            var worksheet = workbook.Sheets[y];
            var headers = {};
            var data = [];

            var currentDate = null;
            var names = {};

            for(var z in worksheet) {
                if(z[0] === '!') continue;
                //parse out the column, row, and value
                var tt = 0;
                for (var i = 0; i < z.length; i++) {
                    if (!isNaN(z[i])) {
                        tt = i;
                        break;
                    }
                };

                var col = z.substring(0,tt);
                var row = parseInt(z.substring(tt));
                var value = worksheet[z].v;

                if(row == 1 && col != 'A') {
                    employees[value] = {};
                    names[col] = value;
                    continue;
                } else if(row > 1) {
                    if(col == 'A') {
                        var date = new Date(value);
                        currentDate = date.getFullYear() + '-' + (date.getMonth()+1) + '-' +  date.getDate();
                        continue;
                    } else {
                        employees[names[col]][currentDate] = (value == 'true' ? true : false);
                    }
                }
            }
        });

        for(var name in employees) {
            this.addEmployee(name, employees[name]);
        }
    }

    buildModel() {
        var model = {
            optimize: {},
            constraints: {},
            variables: {},
            ints: {}
        };

        for (var d = new Date(this.fromDate.getTime()); d <= this.toDate; d.setDate(d.getDate() + 1)) {
            model.constraints[d.getFullYear() + '-' + (d.getMonth()+1) + '-' +  d.getDate()] =
            (this.nonWorkingDays.includes(d.getDay()) ? {equal:0} : {equal:1});
        }

        var variables = {};

        for(var i in this.employees) {
            var name = this.employees[i].name;
            var constraints = this.employees[i].constraints;
            var defaultValue = this.employees[i].default;

            model.optimize[name] = "min";
            model.constraints[name] = {"min": 4};

            for (var d = new Date(this.fromDate.getTime()); d <= this.toDate; d.setDate(d.getDate() + 1)) {
                var dateString = d.getFullYear() + '-' + (d.getMonth()+1) + '-' +  d.getDate();

                variables[name + "_" + dateString] = {};
                variables[name + "_" + dateString][dateString] = defaultValue ? 1 : 0;
                variables[name + "_" + dateString][name] = defaultValue ? 1 : 0;

                model.constraints[name + "_" + dateString] = {max: 1};
            }

            for(var day in constraints) {
                model.constraints[name + '_' + day] = (constraints[day] ? {max: 1} : {equal: 0});
                variables[name + "_" + day] = {};
                variables[name + "_" + day][day] = constraints[day] ? 1 : 0;
                variables[name + "_" + day][name] = constraints[day] ? 1 : 0;

            }

            model.ints[name] = 1;

        }

        // Shuffle variables for better result

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
    }

    create() {
        var model = this.buildModel();

        console.log(model);

        var results = solver.Solve(model);
        for(var i in results) {
            switch(i) {
                case 'feasible':
                break;
                case 'result':
                case 'bounded':
                break;
                default:
                var name = i.replace(/_.+$/, '');
                var date = i.replace(/^.+_/, '');

                if(results[i] == 1) {
                    this.calendar[date] = name;
                }
            }
        }

        // Sort the planning by date
        var tempCalendar = {};
        for (var d = new Date(this.fromDate.getTime()); d <= this.toDate; d.setDate(d.getDate() + 1)) {
            var dateString = d.getFullYear() + '-' + (d.getMonth()+1) + '-' +  d.getDate();

            for(var date in this.calendar) {
                if(date == dateString) {
                    tempCalendar[date] = this.calendar[date];
                }
            }
        }

        this.calendar = tempCalendar;

        return this.calendar;
    }

    exportXlsx() {
        function Workbook() {
            if(!(this instanceof Workbook)) return new Workbook();
            this.SheetNames = [];
            this.Sheets = {};
        }

        var wb = new Workbook(), ws = sheet_from_array_of_arrays(data);

        /* add worksheet to workbook */
        wb.SheetNames.push(ws_name);
        wb.Sheets[ws_name] = ws;

        /* write file */
        XLSX.writeFile(wb, 'export.xlsx');
    }
}






// 4 présences sur deux mois

//console.log(model);

var beginning = new Date();

var planning = new Planning(new Date("2018-3-1"), new Date("2018-3-31"));
// planning.addEmployee('marie', {'2018-3-3': false, '2018-3-10': false, '2018-3-17': false, '2018-3-24': false, '2018-3-31': false});
// planning.addEmployee('jean', {'2018-3-2': false, '2018-3-9': false, '2018-3-16': false, '2018-3-23': false, '2018-3-30': false});
// planning.addEmployee('bernard', {'2018-3-2': false, '2018-3-3': false, '2018-3-4': false, '2018-3-18': false, '2018-3-19': false});
// planning.addEmployee('henriette', {'2018-3-10': false, '2018-3-14': false, '2018-3-16': false, '2018-3-19': false, '2018-3-22': false});
// planning.addEmployee('jerome', {'2018-3-1': false, '2018-3-9': false, '2018-3-10': false, '2018-3-23': false, '2018-3-29': false});

planning.importXlsx('availabilities.xlsx');
//console.log(planning.employees);

planning.create();
console.log(planning.calendar);

var end = new Date();

console.log("Computed in " + (end - beginning) + ' ms');
