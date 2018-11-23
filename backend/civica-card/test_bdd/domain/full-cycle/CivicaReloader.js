'use strict'

const expect = require('chai').expect
const uuidv4 = require('uuid/v4');
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
    catchError
} = require('rxjs/operators');

const Reader = require('./Reader');
const GraphQL = require('./GraphQL');
const Conversation = require('./Conversation');

class CivicaReloader {

    /**
     * 
     * @param {Conversation} conversation 
     * @param {Reader} reader 
     * @param {GraphQL} graphQL 
     */
    constructor(conversation, reader, graphQL) {
        this.conversation = conversation;
        this.reader = reader;
        this.graphQL = graphQL;
    }

    readCivicaCard$() {
        switch (this.reader.cardType) {
            case 'SL1': return this.ReadCivicaCardSL1$();
            case 'SL3': return this.ReadCivicaCardSL3$();
            default: throw new Error('Invalid cardType: ' + this.reader.cardType);
        }
    }

    ReadCivicaCardSL3$() {
        return this.authCivicaCardSL3([0x02, 0x40],'PUBLIC');
        
    }

    authCivicaCardSL3(authRole,cardRole){
        return this.reader.requestCardFirstStepAuth$(authRole).pipe(
            mergeMap(cardFirstSteptAuthChallenge => this.generateCivicaCardReloadSecondAuthToken$(this.conversation.civicaCardReloadConversationId, cardFirstSteptAuthChallenge, cardRole)),
            map(secondAuthToken => {
                const secondStepSamToken = Buffer.alloc(secondAuthToken.length / 2);
                secondStepSamToken.write(secondAuthToken, 0, secondAuthToken.length, 'hex');
                return secondStepSamToken;
            }),
            mergeMap(secondStepSamToken => this.reader.requestCardSecondStepAuth$(secondStepSamToken)),
            tap(cardSecondStepAutResponse => console.log(`  cardSecondStepAutResponse: ${cardSecondStepAutResponse}`))
        );
    }







    generateCivicaCardReloadSecondAuthToken$(conversationId, cardChallenge, cardRole) {
        const query =
            `mutation {
            generateCivicaCardReloadSecondAuthToken(${this.graphQL.convertObjectToInputArgs({ conversationId, cardChallenge, cardRole })}){conversationId, token}
        }`;
        return this.graphQL.executeQuery$(query).pipe(
            tap(({generateCivicaCardReloadSecondAuthToken}) => expect(generateCivicaCardReloadSecondAuthToken).to.not.be.undefined),
            tap(({generateCivicaCardReloadSecondAuthToken}) => expect(generateCivicaCardReloadSecondAuthToken.token).to.not.be.undefined),            
            map(({generateCivicaCardReloadSecondAuthToken}) => generateCivicaCardReloadSecondAuthToken.token),
            tap(token => console.log(`generated CivicaCardReload SecondAuthToken => ${token}`))
        );
    }


}

module.exports = CivicaReloader;