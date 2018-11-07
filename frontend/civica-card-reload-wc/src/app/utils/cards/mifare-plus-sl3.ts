import { Commons } from "../commons";
import { map, mergeMap, mapTo, tap } from "rxjs/operators";
import { GattService } from "../gatt-services";
import { MessageType } from "../communication_profile/message-type";
import { getRndAAuthCard } from '../../api/gql/afcc-reloader.js';
import { BluetoothService } from "@nebulae/angular-ble";
import { ReaderAcr1255 } from "../readers/reader-acr1255";
import { CypherAes } from "../cypher-aes";
import { GatewayService } from "src/app/api/gateway.service";
import { DeviceUiidReq } from "../communication_profile/messages/request/device-uiid-req";
import { AuthCardFirstStep } from "../communication_profile/card-messages/request/auth-card-first-step";
import { DeviceUiidResp } from "../communication_profile/messages/response/device-uiid-resp";
import { AuthCardFirstStepResp } from "../communication_profile/card-messages/response/auth-card-first-step-resp";
import { CardPowerOff } from "../communication_profile/messages/request/card-power-off";
import { CardPowerOn } from "../communication_profile/messages/request/card-power-on";
import { Observable } from "rxjs";
import { getReadCardSecondAuthToken } from '../../api/gql/afcc-reloader.js';
import { v4 as uuid } from 'uuid';

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
   */
  cardAuthenticationFirstStep$(
    bluetoothService: BluetoothService,
    readerAcr1255: ReaderAcr1255,
    cypherAesService: CypherAes,
    sessionKey,
    authKey
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
              return cypherAesService.bytesTohex(Array.from(authCardFirstStepResp.data).slice(1));
            }),
            map(rndA => {
              // return the random bytes generated by the card an the uid of the card (both used to generate the second step of auth)
              return { rndA, uid };
            })
          );
      })
    );
  }

  readCurrentCard$(
    bluetoothService,
    readerAcr1255,
    sessionKey,
    cypherAesService,
    deviceConnectionStatus$,
    gateway
  ) {
    console.log('inicia metodo de lectura');
    // get the key to use in auth card action
    return this.cardPowerOn$(
      bluetoothService,
      readerAcr1255,
      cypherAesService,
      sessionKey
    ).pipe(
      mergeMap(uid => {
        return this.cardAuthenticationFirstStep$(bluetoothService,
          readerAcr1255,
          cypherAesService,
          sessionKey,
          '0440');
      }),
      mergeMap(rndaVsUid => {
        return this.getReadCardSeconduthToken(gateway, rndaVsUid);
      }),
      mergeMap(result => {
        return this.cardPowerOff$(
          bluetoothService,
          readerAcr1255,
          cypherAesService,
          sessionKey
        ).pipe(mapTo({result, status: 'COMPLETED'}));
      })
    );
    // THIS IS THE REAL SECTION REMOVE THE ABDOVE SECTION AND UNCOMMENT THIS
    // from(afccOperationConfig.readFlow).pipe(
    //   filter(readFlowToFilter => (readFlowToFilter as any).key === 'readDebit'),
    //   first(),
    //   mergeMap(readFlow => {
    //     return this.readCardSection$(
    //       bluetoothService,
    //       readerAcr1255,
    //       sessionKey,
    //       cypherAesService,
    //       deviceConnectionStatus$,
    //       gateway,
    //       currentSamId$,
    //       readFlow,
    //       afccOperationConfig,
    //       uidSubject
    //     );
    //   })
    // );
  }

  getReadCardSeconduthToken(gateway: GatewayService, rndaVsUid): Observable<number> {
    return gateway.apollo
    .query<any>({
      query: getReadCardSecondAuthToken,
      variables: {
        conversationId: uuid(),
        cardUid: rndaVsUid.uid,
        challengeKey: rndaVsUid.rndA
      }
      , errorPolicy: 'all'
      })
    .pipe(map(rawData => rawData.data.getDeviceTableSize));
  }

   /**
   * close the read process in the reader
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
}
