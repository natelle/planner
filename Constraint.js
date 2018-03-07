class Constraint {
    constructor(subject, predicate, object, complement = null) {
        console.log("In constructor of Constraint");
        this.subject = subject;
        this.predicate = predicate;
        this.object = object;
        this.complement = complement;
    }

    toString() {

    }
}

module.exports = Constraint;

class Predicate {
    constructor(type) {
        this.type = type;
    }
}

class Entity {
    constructor(type, value) {
        this.type = type;
        this.value = value;
    }
}

class Literal extends Entity {
    constructor(value, forceString = false) {
        var type;

        switch(typeof value) {
            case 'string':
                type = String;
                break;
            case 'number':
                type = !forceString ? Number : String;
                break;
            case 'boolean':
                type = !forceString ? Boolean : String;
                break;
            default:
                
        }
        super(numeric ? Number : String, value);
    }
}

class Range {
    constructor(first, last) {
        this.first = first;
        this.last = last;
    }

    iterator(callback) {
        for(var i=this.first; i<=this.last; i++) {
            callback.call(this, i);
        }
    }
}

class DateRange extends Range {
    constructor(first, last) {
        super(first, last);
    }

    iterator(callback) {
        for (var d = new Date(this.first.getTime()); d <= this.last; d.setDate(d.getDate() + 1)) {
            callback.call(this, d);
        }
    }
}
