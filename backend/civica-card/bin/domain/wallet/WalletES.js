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
     * Creates and returns a CivicaCardReloadConversation
     */
    processWalletSpendingForbiddenEvent$(event) {
        const data = event.data;
        return WalletDA.updateWallet$(data.businessId,data.wallet)
            .pipe(
                tap(conversation => { if (conversation === null) throw new CustomError('CivicaCardReloadConversation not Found', `getCivicaCardReloadConversation(${args.id})`, ENTITY_NOT_FOUND_ERROR_CODE) }),
                map(conversation => this.formatCivicaCardReloadConversationToGraphQLSchema(conversation)),
                mergeMap(rawResponse => GraphqlResponseTools.buildSuccessResponse$(rawResponse)),
                catchError(error => {
                    console.error(error.stack || error);
                    return GraphqlResponseTools.handleError$(error);
                })
            );
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