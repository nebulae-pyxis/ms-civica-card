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
    catchError,
    last
} = require('rxjs/operators');

const Reader = require('./Reader');
const GraphQL = require('./GraphQL');
const Conversation = require('./Conversation');

const CivicaCardData_fields = "identificacionEmpresa,identificacionEmpleado,tipoNumeroDocumento,saldoTarjeta,saldoTarjetaBk,numeroTerminal,formaPagoUsoTransporte,fechaHoraTransaccion,rutaUtilizada,perfilUsuario,rutaAnterior,valorPagoUsoTransporte,secuenciaUsoTrayecto,_saldoTarjeta";

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
            case 'SL1': return this.readCivicaCardSL1$();
            case 'SL3': return this.readCivicaCardSL3$();
            default: throw new Error('Invalid cardType: ' + this.reader.cardType);
        }
    }

    writeReadCivicaCard$() {
        switch (this.reader.cardType) {
            case 'SL1': return this.writeReadCivicaCardSL1$();
            case 'SL3': return this.writeReadCivicaCardSL3$();
            default: throw new Error('Invalid cardType: ' + this.reader.cardType);
        }
    }



    //#region SL3
    readCivicaCardSL3$() {
        return Rx.concat(
            this.authCivicaCardSL3([0x02, 0x40], 'PUBLIC').pipe(
                mergeMap(cardSecondStepAutResponse => this.generateCivicaCardReloadReadApduCommands$(this.conversation.civicaCardReloadConversationId, cardSecondStepAutResponse, 'PUBLIC')),
                mergeMap(binaryCommands => this.reader.executeBinaryCommands$(binaryCommands)),
                mergeMap(binaryCommands => this.processCivicaCardReloadReadApduCommandRespones$(this.conversation.civicaCardReloadConversationId, binaryCommands))
            ),
            this.authCivicaCardSL3([0x04, 0x40], 'DEBIT').pipe(
                mergeMap(cardSecondStepAutResponse => this.generateCivicaCardReloadReadApduCommands$(this.conversation.civicaCardReloadConversationId, cardSecondStepAutResponse, 'CIVICA')),
                mergeMap(binaryCommands => this.reader.executeBinaryCommands$(binaryCommands)),
                mergeMap(binaryCommands => this.processCivicaCardReloadReadApduCommandRespones$(this.conversation.civicaCardReloadConversationId, binaryCommands))
            ),
        ).pipe(
            last()
        );
    }

    writeReadCivicaCardSL3$() {
        return this.authCivicaCardSL3([0x05, 0x40], 'CREDIT').pipe(
            mergeMap(cardSecondStepAutResponse => this.generateCivicaCardReloadWriteAndReadApduCommands$(this.conversation.civicaCardReloadConversationId, cardSecondStepAutResponse, 'CIVICA')),
            mergeMap(binaryCommands => this.reader.executeBinaryCommands$(binaryCommands)),
            mergeMap(binaryCommands => this.processCivicaCardReloadWriteAndReadApduCommandResponses$(this.conversation.civicaCardReloadConversationId, binaryCommands))
        );
    }

    authCivicaCardSL3(authRole, cardRole) {
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
            catchError(error => Rx.throwError(new Error(`Failed to generateCivicaCardReloadSecondAuthToken, error: ${JSON.stringify(error)}`))),
            tap(({ generateCivicaCardReloadSecondAuthToken }) => expect(generateCivicaCardReloadSecondAuthToken).to.not.be.undefined),
            tap(({ generateCivicaCardReloadSecondAuthToken }) => expect(generateCivicaCardReloadSecondAuthToken.token).to.not.be.undefined),
            map(({ generateCivicaCardReloadSecondAuthToken }) => generateCivicaCardReloadSecondAuthToken.token),
            tap(token => console.log(`generated CivicaCardReload SecondAuthToken => ${token}`))
        );
    }
    //#endregion

    //#region SL1

    readCivicaCardSL1$() {
        return this.generateCivicaCardReloadReadApduCommands$(this.conversation.civicaCardReloadConversationId, '', 'CIVICA').pipe(
            mergeMap(binaryCommands => this.reader.executeBinaryCommands$(binaryCommands)),
            mergeMap(binaryCommands => this.processCivicaCardReloadReadApduCommandRespones$(this.conversation.civicaCardReloadConversationId, binaryCommands))
        );        
    }

    writeReadCivicaCardSL1$() {
        return this.generateCivicaCardReloadWriteAndReadApduCommands$(this.conversation.civicaCardReloadConversationId, '', 'CIVICA').pipe(
            mergeMap(binaryCommands => this.reader.executeBinaryCommands$(binaryCommands)),
            mergeMap(binaryCommands => this.processCivicaCardReloadWriteAndReadApduCommandResponses$(this.conversation.civicaCardReloadConversationId, binaryCommands))
        );
    }

    //#endregion


    //#region APDUs GENERATION & PROCESSING
    generateCivicaCardReloadReadApduCommands$(conversationId, cardAuthConfirmationToken, dataType) {
        const query =
            `mutation {
                 generateCivicaCardReloadReadApduCommands(${this.graphQL.convertObjectToInputArgs({ conversationId, cardAuthConfirmationToken, dataType })}){ order, cmd, resp, cbc, rbc }
            }`;
        return this.graphQL.executeQuery$(query).pipe(
            catchError(error => Rx.throwError(new Error(`Failed to generateCivicaCardReloadReadApduCommands, error: ${JSON.stringify(error)}`))),
            tap(({ generateCivicaCardReloadReadApduCommands }) => expect(generateCivicaCardReloadReadApduCommands).not.to.be.null),
            map(({ generateCivicaCardReloadReadApduCommands }) => generateCivicaCardReloadReadApduCommands)
        );
    }

    processCivicaCardReloadReadApduCommandRespones$(conversationId, commands) {
        const mutation =
            `mutation {
                processCivicaCardReloadReadApduCommandRespones( ${this.graphQL.convertObjectToInputArgs({ conversationId, commands })} ){ ${CivicaCardData_fields} }
            }`;

        return this.graphQL.executeQuery$(mutation).pipe(
            catchError(error => Rx.throwError(new Error(`Failed to processCivicaCardReloadReadApduCommandRespones, error: ${JSON.stringify(error)}`))),
            tap(({ processCivicaCardReloadReadApduCommandRespones }) => expect(processCivicaCardReloadReadApduCommandRespones).not.to.be.null),
            map(({ processCivicaCardReloadReadApduCommandRespones }) => processCivicaCardReloadReadApduCommandRespones)
        );
    }

    generateCivicaCardReloadWriteAndReadApduCommands$(conversationId, cardAuthConfirmationToken, dataType) {
        const query =
            `mutation {
                 generateCivicaCardReloadWriteAndReadApduCommands(${this.graphQL.convertObjectToInputArgs({ conversationId, cardAuthConfirmationToken, dataType })}){ order, cmd, resp, cbc, rbc }
            }`;
        return this.graphQL.executeQuery$(query).pipe(
            catchError(error => Rx.throwError(new Error(`Failed to generateCivicaCardReloadWriteAndReadApduCommands, error: ${JSON.stringify(error)}`))),
            tap(({ generateCivicaCardReloadWriteAndReadApduCommands }) => expect(generateCivicaCardReloadWriteAndReadApduCommands).not.to.be.null),
            map(({ generateCivicaCardReloadWriteAndReadApduCommands }) => generateCivicaCardReloadWriteAndReadApduCommands)
        );
    }

    processCivicaCardReloadWriteAndReadApduCommandResponses$(conversationId, commands) {
        const mutation =
            `mutation {
                processCivicaCardReloadWriteAndReadApduCommandResponses( ${this.graphQL.convertObjectToInputArgs({ conversationId, commands })} ){ ${CivicaCardData_fields} }
            }`;

        return this.graphQL.executeQuery$(mutation).pipe(
            catchError(error => Rx.throwError(new Error(`Failed to processCivicaCardReloadWriteAndReadApduCommandResponses, error: ${JSON.stringify(error)}`))),
            tap(({ processCivicaCardReloadWriteAndReadApduCommandResponses }) => expect(processCivicaCardReloadWriteAndReadApduCommandResponses).not.to.be.null),
            map(({ processCivicaCardReloadWriteAndReadApduCommandResponses }) => processCivicaCardReloadWriteAndReadApduCommandResponses)
        );
    }
    //#endregion


    purchaseCivicaCardReload$(value) {
        const mutation =
            `mutation {
            purchaseCivicaCardReload(${this.graphQL.convertObjectToInputArgs({ conversationId: this.conversation.civicaCardReloadConversationId, value: value })}){granted,errorMsg,receipt{id,timestamp,reloadValue,cardInitialValue,cardFinalValue,businesId,posId,posUserName,posUserId,posTerminal}   }
        }`;
        return this.graphQL.executeQuery$(mutation).pipe(
            catchError(error => Rx.throwError(new Error(`Failed to purchaseCivicaCardReload, error: ${JSON.stringify(error)}`))),
            tap(({ purchaseCivicaCardReload }) => console.log(`purchaseCivicaCardReload: ${JSON.stringify(purchaseCivicaCardReload)}`)),
            tap(({ purchaseCivicaCardReload }) => expect(purchaseCivicaCardReload).not.to.be.null),
            map(({ purchaseCivicaCardReload }) => purchaseCivicaCardReload)
        )
    }


}

module.exports = CivicaReloader;