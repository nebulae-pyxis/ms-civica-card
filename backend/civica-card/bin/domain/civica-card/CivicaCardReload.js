'use strict'

const Rx = require("rxjs");
const { tap, mergeMap, catchError, map, mapTo } = require('rxjs/operators');
const uuidv4 = require('uuid/v4');
const Event = require('@nebulae/event-store').Event;
const eventSourcing = require('../../tools/EventSourcing')();
const CivicaCardReloadConversationDA = require('../../data/CivicaCardReloadConversationDA');

class CivicaCardReload {

    static purchaseCivicaCardReload$(conversation, value) {
        if (conversation.purchase !== undefined) {
            return Rx.of(conversation.purchase);
        }

        return Rx.forkJoin(
            this.verifyCardLock$(conversation),
            this.verifyBusinessSpendingAllowed$(conversation)
        ).pipe(
            mergeMap(([cardLockVerification, spendingAllowedVerification]) => {

                if (cardLockVerification && spendingAllowedVerification) {
                    return this.generateReceipt$(conversation, value).pipe(
                        mergeMap(receipt => Rx.forkJoin(
                            this.sendSpendingCommitEvent$(conversation, receipt),
                            this.sendCivicaCardReloadEvent$(conversation, receipt),
                            CivicaCardReloadConversationDA.setPurchaseData$(conversation._id, true, '', receipt),
                        )),
                        map(([spendingCommitedEvent, civicaCardReloadEvent, persistedData]) => (persistedData)));
                } else {
                    return Rx.of({
                        granted: false,
                        errorMsg: !cardLockVerification ? 'Tarjeta Bloqueada' : !spendingAllowedVerification ? 'Saldo insuficiente: verifique su saldo minimo' : 'desconocido'
                    });
                }
            })
        );
    }

    static verifyCardLock$(conversation) {
        return Rx.of(conversation.initialCard.civicaData.indicadorTarjetaBloqueada === 0);
    }

    static verifyBusinessSpendingAllowed$(conversation) {
        return Rx.of(true); //TODO: find real data
    }

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
                notes: `POS: id=${receipt.posId}, userName=${receipt.posUserName}, userId=${receipt.posUserId}, terminal=${receipt.posTerminal} `
            },
            user: conversation.user.name
        })).pipe(
            mergeMap(event => eventSourcing.eventStore.emitEvent$(event)),
            map(emitResult => emitResult.storeResult.event)
        );
    }

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
                location: conversation.pos.location
            },
            user: conversation.user.name
        })).pipe(
            mergeMap(event => eventSourcing.eventStore.emitEvent$(event)),
            map(emitResult => emitResult.storeResult.event)
        );
    }




}

module.exports = CivicaCardReload;