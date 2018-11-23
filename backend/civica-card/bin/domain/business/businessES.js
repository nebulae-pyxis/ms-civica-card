'use strict'

const Rx = require("rxjs");
const { tap, mergeMap, catchError, map, mapTo } = require('rxjs/operators');
const BusinessDA = require('../../data/BusinessDA');


/**
 * Singleton instance
 */
let instance;

class WalletES {

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
 * @returns {WalletES}
 */
module.exports = () => {
    if (!instance) {
        instance = new WalletES();
        console.log(`${instance.constructor.name} Singleton created`);
    }
    return instance;
};