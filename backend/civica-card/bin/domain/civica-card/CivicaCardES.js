'use strict'

const { of, from } = require('rxjs');
const { tap, mergeMap, catchError, map, mapTo } = require('rxjs/operators');
const CivicaCardReloadDA = require("../../data/CivicaCardReloadDA");
const Crosscutting = require("../../tools/Crosscutting");
const mongoDB = require('../../data/MongoDB').singleton();


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

/**
 * Creates the indexes
 * @param {*} indexesCivica 
 */
  createIndexesCivica$(indexesCivica){
    const indexes = [{
      collection: 'CivicaCardReloadHistory_', 
      fields: {'user': 1, 'receipt.posTerminal': 1, 'receipt.posUserId': 1, 'receipt.posUserName': 1, 'receipt.posId': 1},
      indexName: 'CivicaCardReloadHistoryIndex'
    }];
    return from(indexes)
    .pipe(
      //Get the business implied in the transactions
      mergeMap(index =>  {
        index.collection = index.collection+Crosscutting.getMonthYear(new Date());
        return mongoDB.createIndexBackground$(index);
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