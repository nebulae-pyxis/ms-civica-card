'use strict'

const Rx = require("rxjs");
const { tap, mergeMap, catchError, map, mapTo } = require('rxjs/operators');
const WalletDA = require('../../data/WalletDA');


/**
 * Singleton instance
 */
let instance;

class WalletES {

    constructor() {
    }

    /**
     * updates wallet state
     * @param {Event} event 
     */
    handleWalletSpendingForbiddenEvent$(event) {
        const data = event.data;
        return WalletDA.updateWallet$(data.businessId, data.wallet, false);
    }

    /**
     * updates wallet state
     * @param {Event} event 
     */
    handleWalletSpendingAllowedEvent$(event) {
        const data = event.data;
        return WalletDA.updateWallet$(data.businessId, data.wallet, true);
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