/**
 * @fileoverview Tests for the Env class.
 */
/*global describe, it*/

//-----------------------------------------------------------------------------
// Requirements
//-----------------------------------------------------------------------------

import { Pledge } from "../src/pledge.js";
import { PledgeSymbol } from "../src/pledge-symbol.js";
import { expect } from "chai";

//-----------------------------------------------------------------------------
// Helpers
//-----------------------------------------------------------------------------

function delayResolvePledge(value, delay) {
    return new Pledge(resolve => {
        setTimeout(() => {
            resolve(value);
        }, delay);
    });
}

function delayRejectPledge(value, delay) {
    return new Pledge((resolve, reject) => {
        setTimeout(() => {
            reject(value);
        }, delay);
    });
}

//-----------------------------------------------------------------------------
// Tests
//-----------------------------------------------------------------------------

describe("Pledge", () => {

    describe("new Pledge()", () => {

        it("should throw an error when the executor is missing", () => {
            expect(() => {
                new Pledge();
            }).to.throw(/Executor missing/);
        });

        it("should throw an error when the executor is not a function", () => {
            expect(() => {
                new Pledge(42);
            }).to.throw(/Executor must be a function/);
        });

        it("should be in the fulfilled PledgeSymbol.state when the executor calls resolve()", () => {
            const pledge = new Pledge(resolve => {
                resolve(42);
            });

            expect(pledge[PledgeSymbol.state]).to.equal("fulfilled");
            expect(pledge[PledgeSymbol.result]).to.equal(42);
        });

        it("should be in the rejected PledgeSymbol.state when the executor calls reject()", () => {
            const error = new Error();
            const pledge = new Pledge((resolve, reject) => {
                reject(error);
            });

            expect(pledge[PledgeSymbol.state]).to.equal("rejected");
            expect(pledge[PledgeSymbol.result]).to.equal(error);
        });

        it("should be in the rejected PledgeSymbol.state when the executor throws an error", () => {
            const error = new Error();
            const pledge = new Pledge(() => {
                throw error;
            });

            expect(pledge[PledgeSymbol.state]).to.equal("rejected");
            expect(pledge[PledgeSymbol.result]).to.equal(error);
        });

        it("should be in the fulfilled PledgeSymbol.state when the executor calls resolve() with another pledege that is fulfilled", done => {

            const pledge1 = new Pledge(resolve => {
                resolve(42);
            });

            const pledge2 = new Pledge(resolve => {
                resolve(pledge1);
            });

            // first we should be in the pending state
            expect(pledge2[PledgeSymbol.state]).to.equal("pending");
            expect(pledge2[PledgeSymbol.result]).to.be.undefined;

            // then we should be in the fulfilled state
            setTimeout(() => {
                expect(pledge2[PledgeSymbol.state]).to.equal("fulfilled");
                expect(pledge2[PledgeSymbol.result]).to.equal(42);
                done();
            }, 0);
        });


    });

    describe("then()", () => {

        it("should register a fulfillment handler when called with one argument in fulfilled state", done => {
            const pledge = new Pledge(resolve => {
                resolve(42);
            });

            const result = pledge.then(value => {
                expect(value).to.equal(42);
                done();
            });

            expect(result).to.be.instanceOf(Pledge);
            expect(result[PledgeSymbol.state]).to.equal("pending");
        });

        it("should register a fulfillment handler when called with one argument in pending state", done => {
            const pledge = new Pledge(resolve => {
                setTimeout(() => {
                    resolve(42);
                }, 100);
            });

            const result = pledge.then(value => {
                expect(value).to.equal(42);
                done();
            });

            expect(result).to.be.instanceOf(Pledge);
            expect(result[PledgeSymbol.state]).to.equal("pending");

        });

        it("should register a rejection handler when called with one argument in rejected state", done => {
            const pledge = new Pledge((resolve, reject) => {
                reject(42);
            });

            const result = pledge.then(undefined, value => {
                expect(value).to.equal(42);
                done();
            });

            expect(result).to.be.instanceOf(Pledge);
            expect(result[PledgeSymbol.state]).to.equal("pending");

        });

        it("should register a rejection handler when called with one argument in pending state", done => {
            const pledge = new Pledge((resolve, reject) => {
                setTimeout(() => {
                    reject(42);
                }, 100);
            });

            const result = pledge.then(undefined, value => {
                expect(value).to.equal(42);
                done();
            });

            expect(result).to.be.instanceOf(Pledge);
            expect(result[PledgeSymbol.state]).to.equal("pending");
        });

        it("should return a new pledge and calls its rejection handler when an error is thrown", done => {
            const pledge = new Pledge((resolve, reject) => {
                reject(42);
            });

            const error = new TypeError();

            const result = pledge.then(undefined, () => {
                throw error;
            });

            result.then(undefined, reason => {
                expect(reason).to.equal(error);
                done();
            });

        });

        it("should return a new pledge and calls its fulfillment handler when a rejection handler succeeds", done => {
            const pledge = new Pledge((resolve, reject) => {
                reject(42);
            });

            const result = pledge.then(undefined, reason => {
                return reason;
            });

            result.then(value => {
                expect(value).to.equal(42);
                done();
            });

        });

    });

    describe("catch()", () => {

        it("should register a rejection handler when called in rejected state", done => {
            const pledge = new Pledge((resolve, reject) => {
                reject(42);
            });

            const result = pledge.catch(value => {
                expect(value).to.equal(42);
                done();
            });

            expect(result).to.be.instanceOf(Pledge);
            expect(result[PledgeSymbol.state]).to.equal("pending");
        });

        it("should register a rejection handler when called with one argument in pending state", done => {
            const pledge = new Pledge((resolve, reject) => {
                setTimeout(() => {
                    reject(42);
                }, 100);
            });

            const result = pledge.catch(value => {
                expect(value).to.equal(42);
                done();
            });

            expect(result).to.be.instanceOf(Pledge);
            expect(result[PledgeSymbol.state]).to.equal("pending");
        });

        it("should return a new pledge and calls its rejection handler when an error is thrown", done => {
            const pledge = new Pledge((resolve, reject) => {
                reject(42);
            });

            const error = new TypeError();

            const result = pledge.catch(() => {
                throw error;
            });

            result.catch(reason => {
                expect(reason).to.equal(error);
                done();
            });

        });

        it("should return a new pledge and calls its fulfillment handler when a rejection handler succeeds", done => {
            const pledge = new Pledge((resolve, reject) => {
                reject(42);
            });

            const result = pledge.catch(reason => {
                return reason;
            });

            result.then(value => {
                expect(value).to.equal(42);
                done();
            });

        });
    });

    describe("finally()", () => {

        it("should register a settlement  handler when called in rejected state", done => {
            const pledge = new Pledge((resolve, reject) => {
                reject(42);
            });

            const result = pledge.finally(() => {
                done();
            });

            expect(result).to.be.instanceOf(Pledge);
            expect(result[PledgeSymbol.state]).to.equal("pending");
        });

        it("should register a rejection handler when called with one argument in pending state", done => {
            const pledge = new Pledge((resolve, reject) => {
                setTimeout(() => {
                    reject(42);
                }, 100);
            });

            const result = pledge.finally(() => {
                done();
            });

            expect(result).to.be.instanceOf(Pledge);
            expect(result[PledgeSymbol.state]).to.equal("pending");
        });

        it("should return a new pledge and calls its rejection handler when an error is thrown", done => {
            const pledge = new Pledge((resolve, reject) => {
                reject(42);
            });

            const error = new TypeError();

            const result = pledge.finally(() => {
                throw error;
            });

            result.catch(reason => {
                expect(reason).to.equal(error);
                done();
            });

        });

        it("should return a new pledge and calls its rejection handler when a settlement handler succeeds", done => {
            const pledge = new Pledge((resolve, reject) => {
                reject(42);
            });

            const result = pledge.finally(() => {
                return 43;
            });

            result.catch(reason => {
                expect(reason).to.equal(42);
                done();
            });

        });
    });

    describe("Pledge.resolve()", () => {
        it("should create a new instance of Pledge when a non-object is passed", () =>{
            const pledge = Pledge.resolve(42);

            expect(pledge.constructor).to.equal(Pledge);
            expect(pledge[PledgeSymbol.state]).to.equal("fulfilled");
            expect(pledge[PledgeSymbol.result]).to.equal(42);
        });

        it("should return the same Pledge instance when a Pledge is passed", () =>{
            const pledge0 = Pledge.resolve(42);
            const pledge = Pledge.resolve(pledge0);

            expect(pledge).to.equal(pledge0);
        });

        it("should create a new instance of MyPledge when a non-object is passed", () =>{
            class MyPledge extends Pledge {}
            const pledge = MyPledge.resolve(42);

            expect(pledge.constructor).to.equal(MyPledge);
            expect(pledge[PledgeSymbol.state]).to.equal("fulfilled");
            expect(pledge[PledgeSymbol.result]).to.equal(42);
        });

        it("should create a new instance of MyPledge when a Pledge is passed", done =>{
            class MyPledge extends Pledge {}
            const pledge = MyPledge.resolve(Pledge.resolve(42));

            expect(pledge.constructor).to.equal(MyPledge);

            // wait for pledge to resolve
            setTimeout(() => {
                expect(pledge[PledgeSymbol.state]).to.equal("fulfilled");
                expect(pledge[PledgeSymbol.result]).to.equal(42);
                done();
            }, 0);
        });
    });

    describe("Pledge.race()", () => {

        it("should throw an error when `this` is not a constructor", () => {
            expect(() => {
                Pledge.race.call({}, []);
            }).to.throw(/constructor/);
        });

        it("should reject a pledge when retrieving the iterator throws an error", done => {

            const iterable = {
                [Symbol.iterator]() {
                    throw new Error("Uh oh");
                }
            };

            const pledge = Pledge.race(iterable);
            pledge.catch(error => {
                expect(error.message).to.equal("Uh oh");
                done();
            });
        });

        it("should reject a pledge when iterator.next() throws an error", done => {

            const iterable = {
                [Symbol.iterator]() {
                    return {
                        next() {
                            throw new Error("Oops");
                        }
                    };
                }
            };

            const pledge = Pledge.race(iterable);
            pledge.catch(error => {
                expect(error.message).to.equal("Oops");
                done();
            });
        });

        it("should reject a pledge when iterator.next().value throws an error", done => {

            const iterable = {
                [Symbol.iterator]() {
                    return {
                        next() {
                            return {
                                done: false,
                                get value() {
                                    throw new Error("Sorry");
                                }
                            };
                        }
                    };
                }
            };

            const pledge = Pledge.race(iterable);
            pledge.catch(error => {
                expect(error.message).to.equal("Sorry");
                done();
            });
        });

        it("should return the first value that was resolved", done => {

            const pledge = Pledge.race([
                Pledge.resolve(42),
                Pledge.resolve(43),
                Pledge.resolve(44)
            ]);

            pledge.then(value => {
                expect(value).to.equal(42);
                done();
            });

        });

        it("should return the second pledge resolution when it is resolved first", done => {

            const pledge = Pledge.race([
                delayResolvePledge(42, 500),
                Pledge.resolve(43),
                Pledge.resolve(44)
            ]);

            pledge.then(value => {
                expect(value).to.equal(43);
                done();
            });

        });

        it("should return the first reason that was rejected", done => {

            const pledge = Pledge.race([
                Pledge.reject(42),
                Pledge.reject(43),
                Pledge.reject(44)
            ]);

            pledge.catch(reason => {
                expect(reason).to.equal(42);
                done();
            });

        });

        it("should return the second pledge reason when it is settled first", done => {

            const pledge = Pledge.race([
                delayResolvePledge(42, 500),
                Pledge.reject(43),
                Pledge.resolve(44)
            ]);

            pledge.catch(reason => {
                expect(reason).to.equal(43);
                done();
            });

        });
    });

    describe("Pledge.any()", () => {

        it("should throw an error when `this` is not a constructor", () => {
            expect(() => {
                Pledge.any.call({}, []);
            }).to.throw(/constructor/);
        });

        it("should reject a pledge when retrieving the iterator throws an error", done => {
            
            const iterable = {
                [Symbol.iterator]() {
                    throw new Error("Uh oh");
                }
            };

            const pledge = Pledge.any(iterable);
            pledge.catch(error => {
                expect(error.message).to.equal("Uh oh");
                done();
            });
        });

        it("should reject a pledge when iterator.next() throws an error", done => {
            
            const iterable = {
                [Symbol.iterator]() {
                    return {
                        next() {
                            throw new Error("Oops");
                        }
                    };
                }
            };

            const pledge = Pledge.any(iterable);
            pledge.catch(error => {
                expect(error.message).to.equal("Oops");
                done();
            });
        });

        it("should reject a pledge when iterator.next().value throws an error", done => {
            
            const iterable = {
                [Symbol.iterator]() {
                    return {
                        next() {
                            return {
                                done: false,
                                get value() {
                                    throw new Error("Sorry");
                                }
                            };
                        }
                    };
                }
            };

            const pledge = Pledge.any(iterable);
            pledge.catch(error => {
                expect(error.message).to.equal("Sorry");
                done();
            });
        });

        it("should return the first value that was resolved", done => {

            const pledge = Pledge.any([
                Pledge.resolve(42),
                Pledge.resolve(43),
                Pledge.resolve(44)
            ]);

            pledge.then(value => {
                expect(value).to.equal(42);
                done();
            });

        });

        it("should return the second pledge resolution when it is resolved first", done => {

            const pledge = Pledge.any([
                Pledge.reject(42),
                Pledge.resolve(43),
                Pledge.resolve(44)
            ]);

            pledge.then(value => {
                expect(value).to.equal(43);
                done();
            });

        });

        it("should return an aggregate error when all pledges are rejected", done => {

            const pledge = Pledge.any([
                Pledge.reject(42),
                Pledge.reject(43),
                Pledge.reject(44)
            ]);

            pledge.catch(reason => {
                expect(reason.errors).to.deep.equal([42, 43, 44]);
                done();
            });

        });

        it("should return the third pledge value when it is resolved first", done => {

            const pledge = Pledge.any([
                delayResolvePledge(42, 500),
                Pledge.reject(43),
                Pledge.resolve(44)
            ]);

            pledge.then(value => {
                expect(value).to.equal(44);
                done();
            });

        });
    });

    describe("Pledge.all()", () => {

        it("should throw an error when `this` is not a constructor", () => {
            expect(() => {
                Pledge.all.call({}, []);
            }).to.throw(/constructor/);
        });

        it("should reject a pledge when retrieving the iterator throws an error", done => {

            const iterable = {
                [Symbol.iterator]() {
                    throw new Error("Uh oh");
                }
            };

            const pledge = Pledge.all(iterable);
            pledge.catch(error => {
                expect(error.message).to.equal("Uh oh");
                done();
            });
        });

        it("should reject a pledge when iterator.next() throws an error", done => {

            const iterable = {
                [Symbol.iterator]() {
                    return {
                        next() {
                            throw new Error("Oops");
                        }
                    };
                }
            };

            const pledge = Pledge.all(iterable);
            pledge.catch(error => {
                expect(error.message).to.equal("Oops");
                done();
            });
        });

        it("should reject a pledge when iterator.next().value throws an error", done => {

            const iterable = {
                [Symbol.iterator]() {
                    return {
                        next() {
                            return {
                                done: false,
                                get value() {
                                    throw new Error("Sorry");
                                }
                            };
                        }
                    };
                }
            };

            const pledge = Pledge.all(iterable);
            pledge.catch(error => {
                expect(error.message).to.equal("Sorry");
                done();
            });
        });



        it("should return the first value that was rejected", done => {

            const pledge = Pledge.all([
                Pledge.reject(42),
                Pledge.reject(43),
                Pledge.reject(44)
            ]);

            pledge.catch(reason => {
                expect(reason).to.equal(42);
                done();
            });

        });

        it("should return the second pledge rejection when it is resolved first", done => {

            const pledge = Pledge.all([
                Pledge.resolve(42),
                Pledge.reject(43),
                Pledge.resolve(44)
            ]);

            pledge.catch(reason => {
                expect(reason).to.equal(43);
                done();
            });

        });

        it("should return an array when all pledges are fulfilled", done => {

            const pledge = Pledge.all([
                Pledge.resolve(42),
                Pledge.resolve(43),
                Pledge.resolve(44)
            ]);

            pledge.then(results => {
                expect(results).to.deep.equal([42, 43, 44]);
                done();
            });

        });

        it("should return the third pledge rejection when it is rejected first", done => {

            const pledge = Pledge.all([
                delayRejectPledge(42, 500),
                Pledge.resolve(43),
                Pledge.reject(44)
            ]);

            pledge.catch(reason => {
                expect(reason).to.equal(44);
                done();
            });

        });
    });


    describe("Pledge.allSettled()", () => {

        it("should throw an error when `this` is not a constructor", () => {
            expect(() => {
                Pledge.allSettled.call({}, []);
            }).to.throw(/constructor/);
        });

        it("should reject a pledge when retrieving the iterator throws an error", done => {

            const iterable = {
                [Symbol.iterator]() {
                    throw new Error("Uh oh");
                }
            };

            const pledge = Pledge.allSettled(iterable);
            pledge.catch(error => {
                expect(error.message).to.equal("Uh oh");
                done();
            });
        });

        it("should reject a pledge when iterator.next() throws an error", done => {

            const iterable = {
                [Symbol.iterator]() {
                    return {
                        next() {
                            throw new Error("Oops");
                        }
                    };
                }
            };

            const pledge = Pledge.allSettled(iterable);
            pledge.catch(error => {
                expect(error.message).to.equal("Oops");
                done();
            });
        });

        it("should reject a pledge when iterator.next().value throws an error", done => {

            const iterable = {
                [Symbol.iterator]() {
                    return {
                        next() {
                            return {
                                done: false,
                                get value() {
                                    throw new Error("Sorry");
                                }
                            };
                        }
                    };
                }
            };

            const pledge = Pledge.allSettled(iterable);
            pledge.catch(error => {
                expect(error.message).to.equal("Sorry");
                done();
            });
        });



        it("should return all rejected values", done => {

            const pledge = Pledge.allSettled([
                Pledge.reject(42),
                Pledge.reject(43),
                Pledge.reject(44)
            ]);

            pledge.then(reason => {
                expect(reason).to.deep.equal([
                    {
                        status: "rejected",
                        value: 42
                    },
                    {
                        status: "rejected",
                        value: 43
                    },
                    {
                        status: "rejected",
                        value: 44
                    }
                ]);
                done();
            });

        });

        it("should return both fulfilled and rejected values", done => {

            const pledge = Pledge.allSettled([
                Pledge.resolve(42),
                Pledge.reject(43),
                Pledge.resolve(44)
            ]);

            pledge.then(value => {
                expect(value).to.deep.equal([
                    {
                        status: "fulfilled",
                        value: 42
                    },
                    {
                        status: "rejected",
                        value: 43
                    },
                    {
                        status: "fulfilled",
                        value: 44
                    }
                ]);
                done();
            });

        });

        it("should return an array when all pledges are fulfilled", done => {

            const pledge = Pledge.allSettled([
                Pledge.resolve(42),
                Pledge.resolve(43),
                Pledge.resolve(44)
            ]);

            pledge.then(value => {
                expect(value).to.deep.equal([
                    {
                        status: "fulfilled",
                        value: 42
                    },
                    {
                        status: "fulfilled",
                        value: 43
                    },
                    {
                        status: "fulfilled",
                        value: 44
                    }
                ]);
                done();
            });

        });

        it("should return all pledges even when delayed", done => {

            const pledge = Pledge.allSettled([
                delayRejectPledge(42, 500),
                Pledge.resolve(43),
                Pledge.reject(44)
            ]);

            pledge.then(value => {
                expect(value).to.deep.equal([
                    {
                        status: "rejected",
                        value: 42
                    },
                    {
                        status: "fulfilled",
                        value: 43
                    },
                    {
                        status: "rejected",
                        value: 44
                    }
                ]);
                done();
            });

        });
    });





});
