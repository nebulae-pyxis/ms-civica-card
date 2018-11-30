'use strict'

const Rx = require("rxjs");
const { tap, mergeMap, catchError, map, mapTo } = require('rxjs/operators');
const uuidv4 = require('uuid/v4');
const Event = require('@nebulae/event-store').Event;
const eventSourcing = require('../../tools/EventSourcing')();
const CivicaCardReloadConversationDA = require('../../data/CivicaCardReloadConversationDA');

/**
 * Handles Civica reload purchase logic
 */
class CivicaCardReload {

    /**
     * validates and generate a Civica reload purchase
     * @param {*} conversation current conversation
     * @param {Number} value reload value
     */
    static purchaseCivicaCardReload$(conversation, value) {
        //if the conversation already has a purchase then return it
        if (conversation.purchase !== undefined) {
            return Rx.of(conversation.purchase);
        }

        return Rx.forkJoin(
            this.verifyCardLock$(conversation),//verifies the card is no physicly locked
            //append as many verification might be needed here
        ).pipe(
            mergeMap(([cardLockVerification]) => {

                if (cardLockVerification) {
                    return this.generateReceipt$(conversation, value).pipe(
                        mergeMap(receipt => Rx.forkJoin(
                            this.sendSpendingCommitEvent$(conversation, receipt),
                            this.sendCivicaCardReloadEvent$(conversation, receipt),
                            CivicaCardReloadConversationDA.setPurchaseData$(conversation._id, true, '', receipt),
                        )),
                        map(([spendingCommitedEvent, civicaCardReloadEvent, persistedData]) => (persistedData)));
                } else {
                    //if the validation fails, then just return the error
                    return Rx.of({
                        granted: false,
                        errorMsg: !cardLockVerification ? 'Tarjeta Bloqueada' : 'desconocido'
                    });
                }
            })
        );
    }

    /**
     * Verifies the civica card is not lockes
     * @param {*} conversation 
     */
    static verifyCardLock$(conversation) {
        return Rx.of(conversation.initialCard.civicaData.indicadorTarjetaBloqueada === 0);
    }


    /**
     * Generates purchase receipt
     * @param {*} conversation 
     * @param {Number} value 
     */
    static generateReceipt$(conversation, value) {
        return Rx.of(
            {
                id: uuidv4(),// TODO: replace with auto increment
                timestamp: Date.now(),
                reloadValue: value,
                cardInitialValue: conversation.initialCard.civicaData._saldoConsolidado,
                cardFinalValue: (conversation.initialCard.civicaData._saldoConsolidado + value),
                businesId: conversation.businessId,
                posId: conversation.pos.id,
                posUserName: conversation.pos.userName,
                posUserId: conversation.pos.userId,
                posTerminal: conversation.pos.terminal
            }
        );
    }


    /**
     * Sends the SpendingCommit Event so the wallet can charge the business account
     * @param {*} conversation 
     * @param {*} receipt 
     */
    static sendSpendingCommitEvent$(conversation, receipt) {
        return Rx.of(new Event({
            eventType: "WalletSpendingCommited",
            eventTypeVersion: 1,
            aggregateType: "Wallet",
            aggregateId: conversation.businessId,
            data: {
                businessId: conversation.businessId,
                type: "SALE",
                concept: "RECARGA_CIVICA",
                value: receipt.reloadValue,
                terminal: {
                    id: conversation.pos.id,
                    userId: conversation.pos.userId,
                    userName:conversation.pos.userName 
                },
                location: conversation.pos.location,
                user: conversation.user.name,
                notes: ""
            },
            user: conversation.user.name
        })).pipe(
            mergeMap(event => eventSourcing.eventStore.emitEvent$(event)),
            map(emitResult => emitResult.storeResult.event)
        );
    }

    /**
     * Sends CivicaCardReload Event so this transaction is commited in the evet store
     * @param {*} conversation 
     * @param {*} receipt 
     */
    static sendCivicaCardReloadEvent$(conversation, receipt) {
        return Rx.of(new Event({
            eventType: "CivicaCardReload",
            eventTypeVersion: 1,
            aggregateType: "CivicaCard",
            aggregateId: conversation.initialCard.civicaData.numeroTarjetaPublico,
            data: {
                businessId: conversation.businessId,
                value: receipt.reloadValue,
                receipt,
                initialCard: conversation.initialCard,
                finalCard: conversation.finalCard,
                location: conversation.pos.location,
                conversationId: conversation._id
            },
            user: conversation.user.name
        })).pipe(
            mergeMap(event => eventSourcing.eventStore.emitEvent$(event)),
            map(emitResult => emitResult.storeResult.event)
        );
    } 

    /**
     * Sends CivicaCardReloadFinalCardUpdated Event so this transaction is commited in the evet store
     * @param {*} conversation 
     */
    static sendCivicaCardReloadFinalCardUpdatedEvent$(conversation) {
        return Rx.of(new Event({
            eventType: "CivicaCardReloadFinalCardUpdated",
            eventTypeVersion: 1,
            aggregateType: "CivicaCard",
            aggregateId: conversation.initialCard.civicaData.numeroTarjetaPublico,
            data: {
                businessId: conversation.businessId,                
                finalCard: conversation.finalCard,                
                conversationId: conversation.id
            },
            user: conversation.user.name
        })).pipe(
            mergeMap(event => eventSourcing.eventStore.emitEvent$(event)),
            map(emitResult => emitResult.storeResult.event)
        );
    } 

}

module.exports = CivicaCardReload;