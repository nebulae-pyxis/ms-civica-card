import { Commons } from '../commons';
import {
  map,
  mergeMap,
  mapTo,
  tap,
  toArray,
  delay,
  concatMap
} from 'rxjs/operators';
import { GattService } from '../gatt-services';
import { MessageType } from '../communication_profile/message-type';
import { getRndAAuthCard } from '../../api/gql/afcc-reloader.js';
import { BluetoothService } from '@nebulae/angular-ble';
import { ReaderAcr1255 } from '../readers/reader-acr1255';
import { CypherAes } from '../cypher-aes';
import { DeviceUiidReq } from '../communication_profile/messages/request/device-uiid-req';
import { AuthCardFirstStep } from '../communication_profile/card-messages/request/auth-card-first-step';
import { DeviceUiidResp } from '../communication_profile/messages/response/device-uiid-resp';
import { AuthCardFirstStepResp } from '../communication_profile/card-messages/response/auth-card-first-step-resp';
import { CardPowerOff } from '../communication_profile/messages/request/card-power-off';
import { CardPowerOn } from '../communication_profile/messages/request/card-power-on';
import { Observable, of, from } from 'rxjs';
import {
  startCivicaCardReloadConversation,
  generateCivicaCardReloadSecondAuthToken,
  generateCivicaCardReloadReadApduCommands,
  generateCivicaCardReloadWriteAndReadApduCommands,
  processCivicaCardReloadReadApduCommandRespones,
  processCivicaCardReloadWriteAndReadApduCommandResponses
} from '../../api/gql/afcc-reloader.js';
import { v4 as uuid } from 'uuid';
import { CardPowerOnResp } from '../communication_profile/messages/response/card-power-on-resp';
import { AuthCardSecondStepResp } from '../communication_profile/card-messages/response/auth-card-second-step';
import { AuthCardSecondStep } from '../communication_profile/card-messages/request/auth-card-second-step';
import { ApduCommandReq } from '../communication_profile/messages/request/apdu-command';
import { ApduCommandResp } from '../communication_profile/messages/response/apdu-command-resp';
import { ApduReadWriteCardData } from '../communication_profile/card-messages/request/apdu-read-write-card-data';
import { ApduReadWriteCardDataResp } from '../communication_profile/card-messages/response/apdu-read-write-card-data-resp';
import { GatewayService } from '../../api/gql/gateway.service';

export class MyfarePlusSl3 {
  /**
   * get the uiid of the current card
   */
  private getUid$(
    bluetoothService,
    readerAcr1255,
    cypherAesService,
    sessionKey
  ) {
    const uiidReq = new DeviceUiidReq(
      new Uint8Array([0xff, 0xca, 0x00, 0x00, 0x00])
    );
    const message = readerAcr1255.generateMessageRequestFormat(
      uiidReq,
      cypherAesService
    );
    return bluetoothService.sendAndWaitResponse$(
      message,
      GattService.NOTIFIER.SERVICE,
      GattService.NOTIFIER.WRITER,
      [{ position: 3, byteToMatch: MessageType.APDU_COMMAND_RESP }],
      sessionKey
    );
  }

  // #region CARD AUTHENTICATION

  /**
   * Send to the card the request of auth
   * @param bluetoothService The instance of the bluetooth library
   * @param readerAcr1255 The instance of the comunication channel by the reader
   * @param cypherAesService This instance of the tools used to encrypt and decrypt
   * @param sessionKey Current session key of the comunication channel between the reader and the Front end
   * @param authKey Type of role used to auth on card
   * @param conversation Current conversation
   * @param gateway The instance of the comunication channel by the server
   */
  cardAuthenticationFirstStep$(
    bluetoothService: BluetoothService,
    readerAcr1255: ReaderAcr1255,
    cypherAesService: CypherAes,
    sessionKey,
    authKey,
    conversation,
    gateway
  ) {
    const authKeyByte = cypherAesService.hexToBytes(authKey);
    // prepare the auth message to send to card
    const cardAuthFirstStep = new AuthCardFirstStep(
      Commons.concatenate(
        new Uint8Array([0x70]),
        authKeyByte,
        new Uint8Array([0x00])
      )
    );
    const message = readerAcr1255.generateMessageRequestFormat(
      cardAuthFirstStep,
      cypherAesService
    );
    // get the uid of the card (used in the authentication)
    return this.getUid$(
      bluetoothService,
      readerAcr1255,
      cypherAesService,
      sessionKey
    ).pipe(
      map(resultUid => {
        const resp = new DeviceUiidResp(resultUid);
        // get the last 4 bytes of the uid and remove the las 2 bytes
        // of the data(this bytes is onle to verify if is a correct answer)
        const uid = cypherAesService.bytesTohex(resp.data.slice(-6, -2));
        return uid;
      }),
      mergeMap(uid => {
        if (conversation.cardUid && conversation.cardUid !== uid) {
          throw new Error('INVALID_CARD_TO_RELOAD');
        }
        return this.startReloadConversation(gateway, conversation, uid);
      }),
      mergeMap(conversationResult => {
        conversation = conversationResult;
        // after succesful getted the card uiid start the first step of auth in the card
        return bluetoothService
          .sendAndWaitResponse$(
            message,
            GattService.NOTIFIER.SERVICE,
            GattService.NOTIFIER.WRITER,
            [{ position: 3, byteToMatch: MessageType.APDU_COMMAND_RESP }],
            sessionKey
          )
          .pipe(
            map(result => {
              const authCardFirstStepResp = new AuthCardFirstStepResp(result);
              // if the first byte of the data is different to  0x90 that means is an error
              if (authCardFirstStepResp.data[0] !== 0x90) {
                throw new Error('failed in the authentication');
              }
              // is removed the first byte of the date to just use the rndA
              return cypherAesService.bytesTohex(
                Array.from(authCardFirstStepResp.data).slice(1)
              );
            })
          );
      })
    );
  }

  /**
   * start comunication channel with the card and request a auth token to start the auth
   * flow
   * @param bluetoothService The instance of the bluetooth library
   * @param gateway The instance of the comunication channel by the server
   * @param readerAcr1255 The instance of the comunication channel by the reader
   * @param cypherAesService This instance of the tools used to encrypt and decrypt
   * @param sessionKey Current session key of the comunication channel between the reader and the Front end
   * @param conversation Current conversation
   * @param dataType Type of data to read
   */
  authWithCardAndGetReadApduCommands$(
    bluetoothService,
    gateway,
    readerAcr1255,
    cypherAesService,
    sessionKey,
    conversation,
    dataType,
    cardType
  ) {
    if (cardType === 'SL3') {
      conversation.cardType = cardType;
      return this.cardAuthenticationFirstStep$(
        bluetoothService,
        readerAcr1255,
        cypherAesService,
        sessionKey,
        dataType === 'CIVICA' ? '0440' : '0240',
        conversation,
        gateway
      ).pipe(
        mergeMap(authToken => {
          return this.getReadCardSecondAuthToken(
            gateway,
            authToken,
            conversation,
            dataType === 'CIVICA' ? 'DEBIT' : 'PUBLIC'
          );
        }),
        mergeMap(serverResp => {
          return this.cardAuthenticationSecondStep$(
            bluetoothService,
            readerAcr1255,
            cypherAesService,
            sessionKey,
            serverResp
          );
        }),
        mergeMap(authCardConfirmation => {
          const authCardSecondStep = new AuthCardSecondStepResp(
            authCardConfirmation
          );
          return this.getReadCardApduCommands(
            gateway,
            cypherAesService.bytesTohex(authCardSecondStep.data.slice(1)),
            conversation,
            dataType
          );
        })
      );
    } else if (cardType === 'SL1') {
      conversation.cardType = cardType;
      return this.getUid$(
        bluetoothService,
        readerAcr1255,
        cypherAesService,
        sessionKey
      ).pipe(
        map(resultUid => {
          const resp = new DeviceUiidResp(resultUid);
          // get the last 4 bytes of the uid and remove the las 2 bytes
          // of the data(this bytes is onle to verify if is a correct answer)
          const uid = cypherAesService.bytesTohex(resp.data.slice(-6, -2));
          return uid;
        }),
        mergeMap(uid => {
          return this.startReloadConversation(gateway, conversation, uid);
        }),
        mergeMap(conversationResult => {
          conversation = conversationResult;
          return this.getReadCardApduCommands(
            gateway,
            '',
            conversation,
            dataType
          );
        })
      );
    } else {
      throw new Error('CARD_NOT_SUPPORTED');
    }
  }

  /**
   * Send to the card the request of auth
   * @param bluetoothService The instance of the bluetooth library
   * @param readerAcr1255 The instance of the comunication channel by the reader
   * @param cypherAesService This instance of the tools used to encrypt and decrypt
   * @param sessionKey Current session key of the comunication channel between the reader and the Front end
   * @param cardAuthenticationFirstStepResp Response received from the server
   */
  cardAuthenticationSecondStep$(
    bluetoothService: BluetoothService,
    readerAcr1255: ReaderAcr1255,
    cypherAesService: CypherAes,
    sessionKey,
    cardAuthenticationFirstStepResp
  ) {
    return of(cardAuthenticationFirstStepResp).pipe(
      map(firstStepResp => {
        const firstStepRespFormated = JSON.parse(JSON.stringify(firstStepResp));
        if (!firstStepRespFormated.token) {
          throw new Error('card auth not found');
        }
        const authToken = Array.from(cypherAesService.hexToBytes(
          firstStepRespFormated.token
        ) as Uint8Array);
        if (authToken[-2] === 0x90) {
          throw new Error('Authentication with the card failed');
        }
        firstStepRespFormated.data = authToken;
        return firstStepRespFormated;
      }),
      mergeMap(respFormated => {
        const cardAuthSecondStep = new AuthCardSecondStep(
          new Uint8Array([0x72].concat(respFormated.data.slice(0, -2)))
        );
        const message = readerAcr1255.generateMessageRequestFormat(
          cardAuthSecondStep,
          cypherAesService
        );
        return bluetoothService.sendAndWaitResponse$(
          message,
          GattService.NOTIFIER.SERVICE,
          GattService.NOTIFIER.WRITER,
          [{ position: 3, byteToMatch: MessageType.APDU_COMMAND_RESP }],
          sessionKey
        );
      })
    );
  }

  /**
   * get the
   * @param gateway The instance of the comunication channel by the server
   * @param authToken card challenge token
   * @param conversation Current conversation
   * @param dataType type of data to read
   */
  getReadCardSecondAuthToken(
    gateway: GatewayService,
    authToken,
    conversation,
    dataType
  ): Observable<number> {
    return gateway.apollo.use('sales-gateway')
      .mutate<any>({
        mutation: generateCivicaCardReloadSecondAuthToken,
        variables: {
          conversationId: conversation.id,
          cardChallenge: authToken,
          cardRole: dataType
        },
        errorPolicy: 'all'
      })
      .pipe(
      map(rawData => (rawData as any).data.generateCivicaCardReloadSecondAuthToken)
      );
  }

  // #endregion

  // #region READ CARD FLOW

  /**
   * Auth with the card and read the info requested
   * @param bluetoothService The instance of the bluetooth library
   * @param readerAcr1255 The instance of the comunication channel by the reader
   * @param sessionKey Current session key of the comunication channel between the reader and the Front end
   * @param cypherAesService This instance of the tools used to encrypt and decrypt
   * @param conversation Current conversation
   * @param gateway The instance of the comunication channel by the server
   * @param dataType Type of data to read
   */
  readCurrentCard$(
    bluetoothService,
    readerAcr1255,
    sessionKey,
    cypherAesService: CypherAes,
    conversation,
    gateway,
    dataType,
    cardType
  ) {
    return this.authWithCardAndGetReadApduCommands$(
      bluetoothService,
      gateway,
      readerAcr1255,
      cypherAesService,
      sessionKey,
      conversation,
      dataType,
      cardType
    ).pipe(
      mergeMap(apduCommands => {
        return this.sendApduCommandsCard(
          apduCommands,
          readerAcr1255,
          cypherAesService,
          bluetoothService,
          sessionKey
        );
      }),
      mergeMap(apduCommandsResp => {
        return this.processReadApduCommandsCard(
          apduCommandsResp,
          conversation,
          gateway
        );
      }),
      mergeMap(result => {
        return this.cardPowerOff$(
          bluetoothService,
          readerAcr1255,
          cypherAesService,
          sessionKey
        ).pipe(mapTo({ result, status: 'COMPLETED' }));
      })
    );
  }

  /**
   * Send the read apdu commands to read a section of the card
   * @param apduCommands Apdu commands received from the server used to read a section of the card
   * @param readerAcr1255 The instance of the comunication channel by the reader
   * @param cypherAesService This instance of the tools used to encrypt and decrypt
   * @param bluetoothService The instance of the bluetooth library
   * @param sessionKey Current session key of the comunication channel between the reader and the Front end
   */
  sendApduCommandsCard(
    apduCommands,
    readerAcr1255,
    cypherAesService,
    bluetoothService,
    sessionKey
  ) {
    return of(apduCommands).pipe(
      map(arr =>
        (arr as any).sort((a, b) => {
          if ((a as any).order < (b as any).order) {
            return -1;
          }
          if ((a as any).order > (b as any).order) {
            return 1;
          }
          return 0;
        })
      ),
      mergeMap(apduCommandsSorted => {
        return from(apduCommandsSorted).pipe(
          concatMap(apduCommand => {
            const commandBytes = cypherAesService.hexToBytes(
              (apduCommand as any).cmd
            );
            const apduCommandReq = new ApduCommandReq(
              new Uint8Array(commandBytes)
            );
            const message = readerAcr1255.generateMessageRequestFormat(
              apduCommandReq,
              cypherAesService
            );
            return bluetoothService
              .sendAndWaitResponse$(
                message,
                GattService.NOTIFIER.SERVICE,
                GattService.NOTIFIER.WRITER,
                [{ position: 3, byteToMatch: MessageType.APDU_COMMAND_RESP }],
                sessionKey
              )
              .pipe(
                map(apduResult => {
                  const apduResp = new ApduCommandResp(apduResult);
                  (apduCommand as any).resp = cypherAesService.bytesTohex(
                    apduResp.data
                  );
                  return apduCommand;
                })
              );
          }),
          toArray()
        );
      })
    );
  }

  /**
   * Send the response of the apdu commands to the server to convert the bytes to object
   * @param apduCommandsResp responses of the Apdu commands sended to the card
   * @param conversation Current conversation
   * @param gateway The instance of the comunication channel by the server
   */
  processReadApduCommandsCard(
    apduCommandsResp,
    conversation,
    gateway: GatewayService
  ) {
    return from(apduCommandsResp).pipe(
      map(apduCommand => {
        delete (apduCommand as any).__typename;
        return apduCommand;
      }),
      toArray(),
      mergeMap(apduCommands => {
        return gateway.apollo.use('sales-gateway')
          .mutate<any>({
            mutation: processCivicaCardReloadReadApduCommandRespones,
            variables: {
              conversationId: conversation.id,
              commands: apduCommands
            },
            errorPolicy: 'all'
          })
          .pipe(
          map(rawData => {
            if ((rawData as any).errors) {
              const error = (rawData as any).errors[0];
              switch (error.message.code) {
                case 18020:
                  throw new Error('CIVICA_CARD_CORRUPTED_DATA');
                case 18021:
                  throw new Error('CIVICA_CARD_READ_FAILED');
                case 18023:
                  throw new Error('CIVICA_CARD_DATA_EXTRACTION_FAILED');
                case 18024:
                  throw new Error('CIVICA_CARD_AUTH_FAILED');
                default:
                  throw new Error('ERROR_PROCESSING_INFO');
              }
            } else {
              return JSON.parse(
                JSON.stringify(
                  (rawData as any).data.processCivicaCardReloadReadApduCommandRespones
                )
              );
            }
          }
            )
          );
      })
    );
  }

  /**
   * Create a conversation and send the data to the server
   * @param gateway The instance of the comunication channel by the server
   * @param conversation Current conversation
   * @param uid Card uid
   */
  startReloadConversation(gateway: GatewayService, conversation, uid) {
    if (!conversation.cardUid) {
      const posLocation = [
        conversation.position.latitude,
        conversation.position.longitude
      ];
      conversation.cardUid = uid;
      return gateway.apollo.use('sales-gateway')
        .mutate<any>({
          mutation: startCivicaCardReloadConversation,
          variables: {
            id: conversation.id,
            cardUid: uid,
            posId: conversation.posId,
            posUserName: conversation.posUserName,
            posUserId: conversation.posUserId,
            posTerminal: conversation.posTerminal,
            posLocation: posLocation,
            readerType: conversation.readerType,
            cardType: conversation.cardType
          },
          errorPolicy: 'all'
        })
        .pipe(
          map(rawData => {
            if ((rawData as any).errors) {
              const error = (rawData as any).errors[0];
              switch (error.message.code) {
                case 18010:
                  throw new Error('BUSINESS_NOT_FOUND');
                case 18011:
                  throw new Error('BUSINESS_NOT_ACTIVE');
                case 18012:
                  throw new Error('BUSINESS_WALLET_NOT_FOUND');
                case 18013:
                  throw new Error('BUSINESS_WALLET_SPENDING_FORBIDDEN');
                case 2001:
                  throw new Error('INVALID_SESSION');
              }
            } else {
              return (rawData as any).data.startCivicaCardReloadConversation;
            }
          })
        );
    } else if (uid !== conversation.cardUid) {
      throw new Error('NON_EQUAL_CARD');
    }
    else if (conversation.cardUid) {
      return of(conversation);
    }
  }

  /**
   * get the apduCommands used to read the card info
   * @param gateway The instance of the comunication channel by the server
   * @param cardAuthConfirmationToken token used to confirm the
   * @param conversation current conversation of the operation
   * @param dataType data type to read
   */
  getReadCardApduCommands(
    gateway: GatewayService,
    cardAuthConfirmationToken,
    conversation,
    dataType
  ): Observable<number> {
    return gateway.apollo.use('sales-gateway')
      .mutate<any>({
        mutation: generateCivicaCardReloadReadApduCommands,
        variables: {
          conversationId: conversation.id,
          cardAuthConfirmationToken,
          dataType
        },
        errorPolicy: 'all'
      })
      .pipe(
        map(rawData => (rawData as any).data.generateCivicaCardReloadReadApduCommands)
      );
  }

  // #endregion
  // #region WRITE CARD FLOW

  /**
   * Auth with the card and read the info requested
   * @param bluetoothService The instance of the bluetooth library
   * @param readerAcr1255 The instance of the comunication channel by the reader
   * @param sessionKey Current session key of the comunication channel between the reader and the Front end
   * @param cypherAesService This instance of the tools used to encrypt and decrypt
   * @param conversation Current conversation
   * @param gateway The instance of the comunication channel by the server
   * @param dataType Type of data to read
   */
  writeCurrentCard$(
    bluetoothService,
    readerAcr1255,
    sessionKey,
    cypherAesService: CypherAes,
    conversation,
    gateway
  ) {
    return this.authWithCardAndGetWriteApduCommands$(
      bluetoothService,
      gateway,
      readerAcr1255,
      cypherAesService,
      sessionKey,
      conversation
    ).pipe(
      mergeMap(apduCommands => {
        return this.sendApduCommandsCard(
          apduCommands,
          readerAcr1255,
          cypherAesService,
          bluetoothService,
          sessionKey
        );
      }),
      mergeMap(apduCommandsResp => {
        return this.processWriteApduCommandsCard(
          apduCommandsResp,
          conversation,
          gateway
        );
      }),
      mergeMap(result => {
        return this.cardPowerOff$(
          bluetoothService,
          readerAcr1255,
          cypherAesService,
          sessionKey
        ).pipe(mapTo({ result, status: 'COMPLETED' }));
      })
    );
  }

  /**
   * Send the response of the apdu commands to the server to convert the bytes to object
   * @param apduCommandsResp responses of the Apdu commands sended to the card
   * @param conversation Current conversation
   * @param gateway The instance of the comunication channel by the server
   */
  processWriteApduCommandsCard(
    apduCommandsResp,
    conversation,
    gateway: GatewayService
  ) {
    return from(apduCommandsResp).pipe(
      map(apduCommand => {
        delete (apduCommand as any).__typename;
        return apduCommand;
      }),
      toArray(),
      mergeMap(apduCommands => {
        return gateway.apollo.use('sales-gateway')
          .mutate<any>({
            mutation: processCivicaCardReloadWriteAndReadApduCommandResponses,
            variables: {
              conversationId: conversation.id,
              commands: apduCommands
            },
            errorPolicy: 'all'
          })
          .pipe(
          map(rawData => {
            if (rawData.errors) {
              throw new Error(rawData.errors[0].message.method);
            }
            return JSON.parse(
              JSON.stringify(
                (rawData as any).data
                  .processCivicaCardReloadWriteAndReadApduCommandResponses
              )
            );
          }
            )
          );
      })
    );
  }

  /**
   * get the apduCommands used to read the card info
   * @param gateway The instance of the comunication channel by the server
   * @param cardAuthConfirmationToken token used to confirm the
   * @param conversation current conversation of the operation
   * @param dataType data type to read
   */
  getWriteCardApduCommands(
    gateway: GatewayService,
    cardAuthConfirmationToken,
    conversation
  ): Observable<number> {
    return gateway.apollo.use('sales-gateway')
      .mutate<any>({
        mutation: generateCivicaCardReloadWriteAndReadApduCommands,
        variables: {
          conversationId: conversation.id,
          cardAuthConfirmationToken,
          dataType: 'CIVICA'
        },
        errorPolicy: 'all'
      })
      .pipe(
        map(
        rawData => {
          if ((rawData as any).errors) {
            throw new Error('ERROR_REQUESTING_APDUS');
          }
          return (rawData as any).data.generateCivicaCardReloadWriteAndReadApduCommands;
        }
        )
      );
  }

  /**
   * start comunication channel with the card and request a auth token to start the auth
   * flow
   * @param bluetoothService The instance of the bluetooth library
   * @param gateway The instance of the comunication channel by the server
   * @param readerAcr1255 The instance of the comunication channel by the reader
   * @param cypherAesService This instance of the tools used to encrypt and decrypt
   * @param sessionKey Current session key of the comunication channel between the reader and the Front end
   * @param conversation Current conversation
   */
  authWithCardAndGetWriteApduCommands$(
    bluetoothService,
    gateway,
    readerAcr1255,
    cypherAesService,
    sessionKey,
    conversation
  ) {
    return this.cardPowerOn$(
      bluetoothService,
      readerAcr1255,
      cypherAesService,
      sessionKey
    ).pipe(
      mergeMap(result => {
      const cardPowerOnResp = new CardPowerOnResp(result);
      if (cardPowerOnResp.data.byteLength < 1) {
        throw new Error('CARD_NOT_FOUND');
      }
        if (conversation.cardType === 'SL3') {
          return this.cardAuthenticationFirstStep$(
            bluetoothService,
            readerAcr1255,
            cypherAesService,
            sessionKey,
            '0540',
            conversation,
            gateway
          ).pipe(
            mergeMap(authToken => {
              return this.getReadCardSecondAuthToken(
                gateway,
                authToken,
                conversation,
                'CREDIT'
              );
            }),
            mergeMap(serverResp => {
              return this.cardAuthenticationSecondStep$(
                bluetoothService,
                readerAcr1255,
                cypherAesService,
                sessionKey,
                serverResp
              );
            }),
            mergeMap(authCardConfirmation => {
              const authCardSecondStep = new AuthCardSecondStepResp(
                authCardConfirmation
              );
              return this.getWriteCardApduCommands(
                gateway,
                cypherAesService.bytesTohex(authCardSecondStep.data.slice(1)),
                conversation
              );
            })
          );
        } else if (conversation.cardType === 'SL1') {

          return this.getUid$(
            bluetoothService,
            readerAcr1255,
            cypherAesService,
            sessionKey
          ).pipe(
            map(resultUid => {
              const resp = new DeviceUiidResp(resultUid);
              // get the last 4 bytes of the uid and remove the las 2 bytes
              // of the data(this bytes is onle to verify if is a correct answer)
              const uid = cypherAesService.bytesTohex(resp.data.slice(-6, -2));
              return uid;
            }),
            mergeMap(uid => {
              if (conversation.cardUid && conversation.cardUid !== uid) {
                throw new Error('INVALID_CARD_TO_RELOAD');
              }
              return this.getWriteCardApduCommands(gateway, '', conversation);
            }));
        } else {
          throw new Error('CARD_NOT_SUPPORTED');
        }
      })
    );
  }
  // #endregion
  // #region GENERAL_UTILS

  /**
   * Close the read process in the reader
   * @param bluetoothService The instance of the bluetooth library
   * @param readerAcr1255 The instance of the comunication channel by the reader
   * @param cypherAesService This instance of the tools used to encrypt and decrypt
   * @param sessionKey Current session key of the comunication channel between the reader and the Front end
   */
  cardPowerOff$(bluetoothService, readerAcr1255, cypherAesService, sessionKey) {
    const cardPoweOffReq = new CardPowerOff(new Uint8Array(0));
    const message = readerAcr1255.generateMessageRequestFormat(
      cardPoweOffReq,
      cypherAesService
    );
    return bluetoothService.sendAndWaitResponse$(
      message,
      GattService.NOTIFIER.SERVICE,
      GattService.NOTIFIER.WRITER,
      [{ position: 3, byteToMatch: MessageType.CARD_POWER_OFF_RESP }],
      sessionKey
    );
  }

  /**
   * start the read process in the reader
   * @param bluetoothService The instance of the bluetooth library
   * @param readerAcr1255 The instance of the comunication channel by the reader
   * @param cypherAesService This instance of the tools used to encrypt and decrypt
   * @param sessionKey Current session key of the comunication channel between the reader and the Front end
   */
  cardPowerOn$(
    bluetoothService,
    readerAcr1255: ReaderAcr1255,
    cypherAesService,
    sessionKey
  ) {
    const cardPoweOnReq = new CardPowerOn(new Uint8Array(0));
    const message = readerAcr1255.generateMessageRequestFormat(
      cardPoweOnReq,
      cypherAesService
    );
    return bluetoothService.sendAndWaitResponse$(
      message,
      GattService.NOTIFIER.SERVICE,
      GattService.NOTIFIER.WRITER,
      [{ position: 3, byteToMatch: MessageType.CARD_POWER_ON_RESP }],
      sessionKey
    );
  }

  // #endregion
}
