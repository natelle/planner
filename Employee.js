class Employee {

    constructor(name, constraints = []) {
        console.log("Constructor of Employee");
        this.name = name;
        this.constraints = constraints;
    }

    addConstraint(constraint) {
        this.constraints.push(constraint);
    }

    
}

module.exports = Employee;
