/**
 * @fileoverview Misc utilities
 */

//-----------------------------------------------------------------------------
// Helpers not in ECMA-262
//-----------------------------------------------------------------------------


export function isObject(argument) {
    const type = typeof argument;
    return ((type === "object") && (argument !== null)) || type === "function";
}

//-----------------------------------------------------------------------------
// 6.2.3 The Completion Record Specification Type
//-----------------------------------------------------------------------------

export class Completion {
    constructor(type, value, target) {
        this.type = type;
        this.value = value;
        this.target = target;
    }
}

//-----------------------------------------------------------------------------
// 6.2.3.2 NormalCompletion
//-----------------------------------------------------------------------------

export class NormalCompletion extends Completion {
    constructor(argument) {
        super("normal", argument);
    }
}

//-----------------------------------------------------------------------------
// 6.2.3.3 ThrowCompletion
//-----------------------------------------------------------------------------

export class ThrowCompletion extends Completion {
    constructor(argument) {
        super("throw", argument);
    }
}

//-----------------------------------------------------------------------------
// 7.2.3 IsCallable ( argument )
//-----------------------------------------------------------------------------

export function isCallable(argument) {
    return typeof argument === "function";
}

//-----------------------------------------------------------------------------
// 7.2.4 IsConstructor ( argument )
//-----------------------------------------------------------------------------

export function isConstructor(argument) {
    return typeof argument === "function" && typeof argument.prototype !== "undefined";
}

//-----------------------------------------------------------------------------
// 19.5.7 AggregateError Objects
//-----------------------------------------------------------------------------

export function PledgeAggregateError(errors=[], message) {

    const O = new.target === undefined ? new PledgeAggregateError() : this;

    if (typeof message !== "undefined") {
        const msg = String(message);

        Object.defineProperty(O, "message", {
            value: msg,
            writable: true,
            enumerable: false,
            configurable: true
        });
    }

    // errors can be an iterable
    const errorsList = [...errors];

    Object.defineProperty(O, "errors", {
        configurable: true,
        enumerable: false,
        writable: true,
        value: errorsList
    });

    return O;
}

//-----------------------------------------------------------------------------
// 7.4.1 GetIterator ( obj [ , hint [ , method ] ] )
//-----------------------------------------------------------------------------

export function getIterator(obj, hint="sync", method) {

    if (hint !== "sync" && hint !== "async") {
        throw new TypeError("Invalid hint.");
    }

    if (method === undefined) {
        
        if (hint === "async") {
        
            method = obj[Symbol.asyncIterator];
        
            if (method === undefined) {
                const syncMethod = obj[Symbol.iterator];
                const syncIteratorRecord = getIterator(obj, "sync", syncMethod);

                // can't accurately represent CreateAsyncFromSyncIterator()
                return syncIteratorRecord;
            }
        } else {
            method = obj[Symbol.iterator];
        }
    }

    const iterator = method.call(obj);

    if (!isObject(iterator)) {
        throw new TypeError("Iterator must be an object.");
    }

    const nextMethod = iterator.next;

    return {
        iterator,
        nextMethod,
        done: false
    };

}

//-----------------------------------------------------------------------------
// 7.4.2 IteratorNext ( iteratorRecord [ , value ] )
//-----------------------------------------------------------------------------

export function iteratorNext(iteratorRecord, value) {

    let result;

    if (value === undefined) {
        result = iteratorRecord.nextMethod.call(iteratorRecord.iterator);
    } else {
        result = iteratorRecord.nextMethod.call(iteratorRecord.iterator, value);
    }

    if (!isObject(result)) {
        throw new TypeError("Result must be an object.");
    }

    return result;

}

//-----------------------------------------------------------------------------
// 7.4.3 IteratorComplete(iterResult)
//-----------------------------------------------------------------------------

export function iteratorComplete(iterResult) {

    if (!isObject(iterResult)) {
        throw new TypeError("Argument must be an object.");
    }

    return Boolean(iterResult.done);
}

//-----------------------------------------------------------------------------
// 7.4.4 IteratorValue(iterResult)
//-----------------------------------------------------------------------------

export function iteratorValue(iterResult) {

    if (!isObject(iterResult)) {
        throw new TypeError("Argument must be an object.");
    }

    return iterResult.value;
}

//-----------------------------------------------------------------------------
// 7.4.5 IteratorStep ( iteratorRecord )
//-----------------------------------------------------------------------------

export function iteratorStep(iteratorRecord) {

    const result = iteratorNext(iteratorRecord);
    const done = iteratorComplete(result);
    
    if (done) {
        return false;
    }

    return result;
}
