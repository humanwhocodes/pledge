/**
 * @fileoverview Rejection Tracker
 */

import { PledgeSymbol } from "./pledge-symbol";

//-----------------------------------------------------------------------------
// 8.1.4.7 Unhandled promise rejections
// https://html.spec.whatwg.org/multipage/webappapis.html#promiserejectionevent
//-----------------------------------------------------------------------------

const canceled = Symbol("canceled");

class PledgeRejectionEvent {
    constructor(pledge, reason) {
        this.pledge = pledge;
        this.reason = reason;
        this[canceled] = false;
    }

    preventDefault() {
        this[canceled] = true;
    }
}

export class RejectionTracker {

    constructor(logger = console) {
        
        /**
         * This set keeps track of promises that were rejected but were not
         * handled. All promises in this set will trigger an unhandledrejection
         * event if they are still there during the monitoring phase of
         * the rejection tracking.
         * @type Set
         * @property aboutToBeNotified
         */
        this.aboutToBeNotified = new Set();

        /**
         * This set keeps track of rejected promises that have been handled
         * and will trigger a rejectionhandled event.
         * @type Set
         * @property outstandingRejections
         */
        this.outstandingRejections = new WeakSet();
        this.logger = logger;
        this.timeoutId = 0;
    }

    startMonitor() {

        // only start monitor once
        if (this.timeoutId > 0) {
            return;
        }

        this.timeoutId = setInterval(() => {

            const list = this.aboutToBeNotified;

            this.aboutToBeNotified = new Set();

            if (list.size === 0) {
                this.stopMonitor();
                return;
            }

            for (const p of list) {
                if (p[PledgeSymbol.isHandled]) {
                    continue;
                }

                const event = new PledgeRejectionEvent(p, p[PledgeSymbol.result]);
                p.constructor.onUnhandledRejection(event);

                const notHandled = !event[canceled];

                this.outstandingRejections.add(p);
                
                if (notHandled) {
                    
                    // what to do here?

                    this.logger.error(`Pledge rejection was not caught: ${ p[PledgeSymbol.result] }`);
                }
            }
        }, 500);
    }

    stopMonitor() {
        clearInterval(this.timeoutId);
        this.timeoutId = 0;
    }

    track(pledge, operation) {
        
        if (operation === "reject") {
            this.aboutToBeNotified.add(pledge);
        }

        if (operation === "handle") {
            if (this.aboutToBeNotified.has(pledge)) {
                this.aboutToBeNotified.delete(pledge);
                return;
            }

            if (!this.outstandingRejections.has(pledge)) {
                return;
            }

            this.outstandingRejections.delete(pledge);

            setTimeout(() => {
                const event = new PledgeRejectionEvent(pledge, pledge[PledgeSymbol.result]);
                pledge.constructor.onRejectionHandled(event);
            }, 0);            
        }

        // not part of spec, need to toggle monitoring
        if (this.aboutToBeNotified.size > 0) {
            this.startMonitor();
        } else {
            this.stopMonitor();
        }

    }
}
