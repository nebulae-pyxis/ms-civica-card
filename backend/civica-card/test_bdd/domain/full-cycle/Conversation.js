'use strict';

const { Event } = require('../../../node_modules/@nebulae/event-store/index');

const uuidv4 = require('uuid/v4');
const GrapQL = require('./GraphQL');

const Rx = require('rxjs');
const {
    tap,
    switchMap,
    delay,
    filter,
    map,
    first,
    mapTo,
    mergeMap,
    concatMap,
    timeout,
    retry,
    retryWhen,
    delayWhen
} = require('rxjs/operators');


const CivicaReloadConversation_fields = 'id, timestamp, userJwt,userName, posId, posUser posTerminal, posLocation, readerType, cardType,cardUid, uiState, uiStateHistory,purchase{ granted,errorMsg,receipt{id,timestamp,reloadValue,cardInitialValue,cardFinalValue,businesId,posId,posUserName,posUserId,posTerminal}}';

class Conversation {

    /**
     * 
     * @param {GrapQL} gqlClient 
     */
    constructor(gqlClient, readerType, cardType, cardUid, mqttBroker, businessId = 'ee9ffdbb-6906-49f1-aa72-955c367751d3') {
        this.gqlClient = gqlClient;
        this.civicaCardReloadConversationId = uuidv4();
        this.civicaCardReloadConversationArgs = {
            id: this.civicaCardReloadConversationId,
            posId: 'mocha-pos-id',
            posUserName: 'mocha-pos-user-name',
            posUserId: 'mocha-pos-user-id',
            posTerminal: 'mocha-terminal-RANDOM',
            posLocation: [-75.612855, 6.161791],
            readerType,
            cardType,
            cardUid
        };

        this.mqttBroker = mqttBroker;
        this.businessId = businessId;
    }

    startConversation$() {
        const query = `
        mutation{
            startCivicaCardReloadConversation( ${this.gqlClient.convertObjectToInputArgs(this.civicaCardReloadConversationArgs)} ){
                ${CivicaReloadConversation_fields}
            }
          }`;
        return this.gqlClient.executeQuery$(query).pipe(            
            retryWhen(errors => errors.pipe(
                tap(error => console.log(`      startConversation$ Error: ${JSON.stringify(error)}`)),
                mergeMap(error => {
                    switch (error.message.code) {
                        case 18010: return this.publishBusinessCreation$();
                        case 18011: return this.publishBusinessActivation$();
                        case 18012: return this.publishWalletCreation$();
                        case 18013: return this.publishWalletSpendingAllowed$();
                    }
                }),
                delay(1000)
            )),            
            map( ({startCivicaCardReloadConversation}) =>  startCivicaCardReloadConversation)
        );
    }

    queryConversation$(conversationId = this.civicaCardReloadConversationId) {
        const query = `
        query{
            CivicaCardReloadConversation(id: "${conversationId}"){
                ${CivicaReloadConversation_fields}
            }
          }`;
        return this.gqlClient.executeQuery$(query).pipe(            
            map( ({CivicaCardReloadConversation}) =>  CivicaCardReloadConversation)

        );
    }




    publishBusinessCreation$() {
        return this.mqttBroker.publish$(new Event({
            eventType: 'BusinessDeactivated',
            eventTypeVersion: 1,
            aggregateType: 'Business',
            aggregateId: this.businessId,
            data: false,
            user: 'Mocha',
            aggregateVersion: 999
        }));
    }

    publishBusinessActivation$() {
        return this.mqttBroker.publish$(new Event({
            eventType: 'BusinessActivated',
            eventTypeVersion: 1,
            aggregateType: 'Business',
            aggregateId: this.businessId,
            data: false,
            user: 'Mocha',
            aggregateVersion: 999
        }));
    }
    publishWalletCreation$() {
        return this.mqttBroker.publish$(new Event({
            eventType: 'WalletSpendingForbidden',
            eventTypeVersion: 1,
            aggregateType: 'Wallet',
            aggregateId: '5beb51abe5b2f02571740551',
            data:  { businessId: this.businessId, wallet: { main: 0, bonus: 0 } },
            user: 'Mocha',
            aggregateVersion: 999
        }));
    }
    publishWalletSpendingAllowed$() {
        return this.mqttBroker.publish$(new Event({
            eventType: 'WalletSpendingAllowed',
            eventTypeVersion: 1,
            aggregateType: 'Wallet',
            aggregateId: '5beb51abe5b2f02571740551',
            data:  { businessId: this.businessId, wallet: { main: 0, bonus: 0 } },
            user: 'Mocha',
            aggregateVersion: 999
        }));
    }




}

module.exports = Conversation;