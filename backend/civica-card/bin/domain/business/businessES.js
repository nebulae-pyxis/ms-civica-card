'use strict'

const Rx = require("rxjs");
const { tap, mergeMap, catchError, map, mapTo } = require('rxjs/operators');
const BusinessDA = require('../../data/BusinessDA');


/**
 * Singleton instance
 */
let instance;

class BusinessES {

    constructor() {
    }

    /**
     * updates business active flag
     * @param {Event} event 
     */
    handleBusinessActivatedEvent$(event) {
        return BusinessDA.updateBusinessActive$(event.aid,true);
    }

    /**
     * updates business active flag
     * @param {Event} event 
     */
    handleBusinessDeactivatedEvent$(event) {
        return BusinessDA.updateBusinessActive$(event.aid,false);
    }

    /**
     * updates business state
     * @param {Event} event 
     */
    handleWalletSpendingForbiddenEvent$(event) {
        const data = event.data;
        return BusinessDA.updateBusinessWallet$(data.businessId, data.wallet, false);
    }

    /**
     * updates business state
     * @param {Event} event 
     */
    handleWalletSpendingAllowedEvent$(event) {
        const data = event.data;
        return BusinessDA.updateBusinessWallet$(data.businessId, data.wallet, true);
    }

}


/**
 * @returns {BusinessES}
 */
module.exports = () => {
    if (!instance) {
        instance = new BusinessES();
        console.log(`${instance.constructor.name} Singleton created`);
    }
    return instance;
};