/**
 * @fileoverview Misc utilities
 */

//-----------------------------------------------------------------------------
// Helpers
//-----------------------------------------------------------------------------

export function isObject(argument) {
    const type = typeof argument;
    return ((type === "object") && (argument !== null)) || type === "function";
}

export function isCallable(argument) {
    return typeof argument === "function";
}

export function call(F, V, argumentsList = []) {
    if (!isCallable(F)) {
        throw new TypeError("Function is not callable.");
    }

    return F.apply(V, argumentsList);
}
