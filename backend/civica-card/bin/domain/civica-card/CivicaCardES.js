'use strict'

const { of } = require('rxjs');
const { tap, mergeMap, catchError, map, mapTo } = require('rxjs/operators');
const CivicaCardReloadDA = require("../../data/CivicaCardReloadDA");


/**
 * Singleton instance
 */
let instance;

class CivicaCardES {
 
    constructor() {
    }

    /**
     * Persist the civica card reload
     */
    handleCivicaCardReload$(civicaCaredReloadEvent){
        return of(civicaCaredReloadEvent)
        .pipe(
            mergeMap(event => {
                return CivicaCardReloadDA.saveCivicaCardReloadHistory$(event)
            })
        );
    }

    /**
     * Persist final civica card updated
     */
    handleCivicaCardReloadFinalCardUpdated$(finalCivicaCardUpdatedEvent){
        return of(finalCivicaCardUpdatedEvent)
        .pipe(
            mergeMap(event => {
                return CivicaCardReloadDA.updateCivicaCardReloadFinalCard$(event)
            })
        );
    }
}


/**
 * @returns {CivicaCardES}
 */
module.exports = () => {
    if (!instance) {
        instance = new CivicaCardES();
        console.log(`${instance.constructor.name} Singleton created`);
    }
    return instance;
};