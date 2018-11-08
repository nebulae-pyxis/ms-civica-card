'use strict';

const Rx = require('rxjs');
const { map, mergeMap, catchError, tap, mapTo } = require('rxjs/operators');
const { SamClusterClient } = require('../tools/mifare');
const uuidv4 = require('uuid/v4');


let instance;

class CivicaCard {
  constructor() {
    this.transaction = {
      appId: 'CIVICA-CARD-BACKEND',
      transactionId: uuidv4()
    };
    this.samClusterClient = new SamClusterClient({
      mqttServerUrl: 'tcp://rcswsyrt:wAQAois_Sqt5@m15.cloudmqtt.com:16858',
      replyTimeout: 1000
    });
  }


  //#region  mappers for API responses
  getReadCardSecondAuthToken$({ root, args, jwt }, authToken) {
    //console.log('llegan args: ', args);
    //return Rx.of({ authToken: 'ACA HEXA DE RESPUESTA' })
    return this.samClusterClient
      .requestSamFirstStepAuth$(
        {
          uid: args.cardUid,
          cardFirstSteptAuthChallenge: args.challengeKey
        },
        this.transaction,
        this.samClusterClient.KEY_DEBIT
      )
      .pipe(
        tap(samFirstStepAuthResponse =>
          console.log(
            `  samFirstStepAuthResponso: SamId:${
              samFirstStepAuthResponse.samId
            }, secondStepSamToken: ${samFirstStepAuthResponse.secondStepSamToken.toString(
              'hex'
            )}`
          )
        ),
        tap(
          samFirstStepAuthResponse =>
            (this.transaction.samId = samFirstStepAuthResponse.samId)
        ),
        map(samFirstStepAuthResponse => ({
          authToken: samFirstStepAuthResponse.secondStepSamToken.toString('hex')
        })),
        mergeMap(rawResponse => this.buildSuccessResponse$(rawResponse)),
        catchError(error => this.handleError$(error))
      );
  }

  getReaderKey$({ root, args, jwt }, authToken) {
    return Rx.of(undefined);
  }

  getReadCardApduCommands$({ root, args, jwt }, authToken) {
    console.log('args APDUS: ', args);
    //cardSecondStepAuthConfirmation, { appId, transactionId, samId }
    return this.samClusterClient
      .requestSamSecondStepAuth$(
        args.cardAuthConfirmationToken,
        this.transaction
      )
      .pipe(
        tap(samSecondStepAuthResp =>
          console.log(
            `  samSecondStepAuthResp :${JSON.stringify(samSecondStepAuthResp)}`
          )
        ),
        mapTo(({ apduCommands: ['test', 'list'] })),
        mergeMap(rawResponse => this.buildSuccessResponse$(rawResponse)),
        tap(resp => {
          console.log('Se envia respuesta a api: ', resp);
        }),
        catchError(error => this.handleError$(error))
      );
  }

  extractReadCardData$({ root, args, jwt }, authToken) {
    return Rx.of(undefined);
  }

  getCardReloadInfo$({ root, args, jwt }, authToken) {
    return Rx.of(undefined);
  }

  extractReadWriteCardData$({ root, args, jwt }, authToken) {
    return Rx.of(undefined);
  }

  getConversation$({ root, args, jwt }, authToken) {
    return Rx.of(undefined);
  }
  //#endregion
}

/**
 * @returns {CivicaCard}
 */
module.exports = () => {
  if (!instance) {
    instance = new CivicaCard();
    console.log(`${instance.constructor.name} Singleton created`);
  }
  return instance;
};
