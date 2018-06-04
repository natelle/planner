var solver = require("javascript-lp-solver"),
model = {
    // "optimize": {
    //     "bacon": "max",
    //     "cheddar cheese": "max",
    //     "french fries": "max"
    // },
    "constraints": {
        "mon": {"min": 1},
        "tue": {"min": 1},
        "wed": {"min": 1},
        "thu": {"min": 1},
        "fri": {"min": 1},
        "sat": {"min": 1},
        "sun": {"min": 0},
        "mar": {"min": 3},
        "jea": {"min": 3},
        "ber": {"min": 3}
    },
    "variables": {
        "mar1":      {"mon": 1, "tue": 0, "wed": 0, "thu": 0, "fri": 0, "sat": 0, "sun": 0, "mar": 1},
        "mar2":      {"mon": 0, "tue": 1, "wed": 0, "thu": 0, "fri": 0, "sat": 0, "sun": 0, "mar": 1},
        "mar4":      {"mon": 0, "tue": 0, "wed": 0, "thu": 1, "fri": 0, "sat": 0, "sun": 0, "mar" :1},
        "mar5":      {"mon": 0, "tue": 0, "wed": 0, "thu": 0, "fri": 1, "sat": 0, "sun": 0, "mar": 1},

        "jea2":      {"mon": 0, "tue": 1, "wed": 0, "thu": 0, "fri": 0, "sat": 0, "sun": 0, "jea": 1},
        "jea3":      {"mon": 0, "tue": 0, "wed": 1, "thu": 0, "fri": 0, "sat": 0, "sun": 0, "jea": 1},
        "jea5":      {"mon": 0, "tue": 0, "wed": 0, "thu": 0, "fri": 1, "sat": 0, "sun": 0, "jea": 1},

        "ber1":      {"mon": 1, "tue": 0, "wed": 0, "thu": 0, "fri": 0, "sat": 0, "sun": 0, "ber": 1},
        "ber2":      {"mon": 0, "tue": 1, "wed": 0, "thu": 0, "fri": 0, "sat": 0, "sun": 0, "ber": 1},
        "ber3":      {"mon": 0, "tue": 0, "wed": 1, "thu": 0, "fri": 0, "sat": 0, "sun": 0, "ber": 1},
        "ber6":      {"mon": 0, "tue": 0, "wed": 0, "thu": 0, "fri": 0, "sat": 1, "sun": 0, "ber": 1},
    },
    "binaries": {"mar1": 1, "mar2": 1, "mar4": 1, "mar5": 1, "jea2": 1, "jea3": 1, "jea5": 1, "ber1": 1, "ber2": 1, "ber3": 1, "ber6": 1}
}

console.log(solver.Solve(model));
