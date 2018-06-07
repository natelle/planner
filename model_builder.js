var employees = {};


function addEmployee(name, workingDays)
{
    employees[name] = workingDays;
}

function buildModel(availabilities)
{
    var model = {
        optimize: {},
        constraints: {
            monday: {min: 1},
            tuesday: {min: 1},
            wednesday: {min: 1},
            thursday: {min: 1},
            friday: {min: 1},
            saturday: {min: 1},
            sunday: {min: 1},
        },
        variables: {}
    };

    for(var name in availabilities) {
        model.optimize[name] = "min";
        //model.constraints[name] = {min: 3}
        for(var day in availabilities[name]) {
            model.variables[name + "_" + day] = {};
            model.variables[name + "_" + day][day] = availabilities[name][day] ? 1 : 0;
            model.variables[name + "_" + day][name] = availabilities[name][day] ? 1 : 0;
        }
    }

    return model;
}

addEmployee('marie', {monday: true, tuesday: true, wednesday: false, thursday: true, friday: true, saturday: false, sunday: true});
addEmployee('jean', {monday: true, tuesday: false, wednesday: true, thursday: false, friday: true, saturday: true, sunday: true});

var model = buildModel(employees);

console.log(JSON.stringify(model));


//buildModel()
