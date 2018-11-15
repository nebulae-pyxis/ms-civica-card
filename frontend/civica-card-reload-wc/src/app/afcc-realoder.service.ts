import { Injectable } from '@angular/core';
import { OperabilityState } from './utils/operability-sate';
import { BehaviorSubject, Subscription } from 'rxjs';
import { BluetoothService } from '@nebulae/angular-ble';
import { ConnectionStatus } from './utils/connection-status';
import { CypherAes } from './utils/cypher-aes';
import { ReaderAcr1255 } from './utils/readers/reader-acr1255';
import * as Rx from 'rxjs';
import { switchMap, mergeMap, takeUntil, filter, map, tap, delay, mapTo } from 'rxjs/operators';
import { GatewayService } from './api/gateway.service';
import { MyfarePlusSl3 } from './utils/cards/mifare-plus-sl3';
import {
  purchaseCivicaCardReload,
  setCivicaCardReloadConversationUiState,
  CivicaCardReloadConversation
} from './api/gql/afcc-reloader.js';
import { v4 as uuid } from 'uuid';

@Injectable({
  providedIn: 'root'
})

export class AfccRealoderService {

  operabilityState$ = new BehaviorSubject<OperabilityState>(
    OperabilityState.UNKNOWN_POSITION
  );
  conversation: any = {};
  error$ = new Rx.Subject<any>();
  cardReloadAborted$ = new Rx.Subject<any>();
  cardReloadDone$ = new Rx.Subject<any>();
  reloaderConnected$ = new Rx.Subject<any>();
  reloaderStandByMode$ = new Rx.Subject<String>();
  reloaderWorkingMode$ = new Rx.Subject<String>();
  cardRead$ = new Rx.Subject<String>();
  saleAuthorization$ = new Rx.Subject<String>();
  operation$ = new Rx.Subject<String>();
  receipt$ = new Rx.Subject<String>();
  readerType;
  currentCardReaded$ = new Rx.BehaviorSubject<any>({});


  // #region VARIABLES ACR1255
  deviceConnectionStatus$ = new BehaviorSubject<String>(
    ConnectionStatus.DISCONNECTED
  );
  deviceStartIdleSubscription = new Subscription();
  deviceStopIdleSubscription = new Subscription();
  readerAcr1255: ReaderAcr1255;
  keyReader;
  batteryLevel$ = new BehaviorSubject<any>(0);
  deviceName$ = new BehaviorSubject<String>('Venta carga tarjetas');
  private cypherAesService: CypherAes;
  sessionKey;
  // #endregion

  // #region VARIABLES MIFARE SL3
  readingCard = false;
  readCardAttempts = 0;
  myfarePlusSl3: MyfarePlusSl3;
  // #endregion

  constructor(private bluetoothService: BluetoothService,
    public gateway: GatewayService) {
    this.cypherAesService = new CypherAes();
    this.readerAcr1255 = new ReaderAcr1255();
    this.myfarePlusSl3 = new MyfarePlusSl3();
    // TODO: ESTA LLAVE SE DEBE CONSULTAR POR GRAPHQL Y SE DEBE QUITAR DEL CONSTRUCTOR
    const key = [65, 67, 82, 49, 50, 53, 53, 85, 45, 74, 49, 32, 65, 117, 116, 104];
    this.keyReader = key;
    this.cypherAesService.config(key);

    this.operabilityState$.subscribe(operabilityState => {
      if (operabilityState === OperabilityState.RELOADING_CARD ||
        operabilityState === OperabilityState.RELOADING_CARD_ERROR ||
        operabilityState === OperabilityState.RELOAD_CARD_ABORTED ||
        operabilityState === OperabilityState.RELOAD_CARD_SUCCESS) {
        this.conversation.state = operabilityState;
        }
    });
  }

  // #region CONNECTION ACR1255
  stablishNewConnection$() {
    this.deviceConnectionStatus$.next(ConnectionStatus.CONNECTING);
    // Discover and connect to a device
    return this.readerAcr1255
      .stablishNewConnection$(
        this.bluetoothService,
        this.cypherAesService,
        this.batteryLevel$,
        this.deviceName$
      )
      .pipe(
        // if all the auth process finalize correctly, change the key and the current connection status
        switchMap(sessionKey => this.onConnectionSuccessful$(sessionKey)),
        mergeMap(() =>
          // Start the a listener with the status of the reader
          this.readerAcr1255.listenDeviceConnectionChanges$(
            this.bluetoothService,
            this.sessionKey
          )
        ),
        takeUntil(
          // end all the process if the connection with the device is lost
          this.getDevice$().pipe(
            filter(device => device === undefined || device === null),
            mergeMap(() =>
              this.readerAcr1255.stopNotifiersListeners$(this.bluetoothService)
            )
          )
        )
      );
  }



   /**
   * change the reader key to the session key and change the state to connected
   */
  onConnectionSuccessful$(sessionKey) {
    this.readerType = 'BLE_HIGH_LEVEL';
    return Rx.defer(() => {
      this.changeCypherMasterKey(Array.from(sessionKey));
      this.deviceConnectionStatus$.next(ConnectionStatus.CONNECTED);
      this.operabilityState$.next(OperabilityState.CONNECTED);
      return Rx.of('connection succeful');
    });
  }

   /**
   * disconnect from the current device
   */
  disconnectDevice() {
    this.bluetoothService.disconnectDevice();
  }

  /**
   * change the session key to the reader key
   */
  onConnectionLost() {
    this.changeCypherMasterKey(this.keyReader);
    this.operabilityState$.next(OperabilityState.DISCONNECTED);
    this.disconnectDevice();
  }

  initBluetoothValues() {
    this.cypherAesService = new CypherAes();
    this.readerAcr1255 = new ReaderAcr1255();
    this.myfarePlusSl3 = new MyfarePlusSl3();
    this.sessionKey = undefined;
    this.cypherAesService.config(this.keyReader);
  }

  // #endregion

   // #region Authentication ACR1255

  changeCypherMasterKey(masterKey) {
    this.sessionKey = masterKey;
    this.cypherAesService.changeMasterKey(this.sessionKey);
  }

  // #endregion

  // #region General Utils ACR1255

  /**
   * Get the current device connected in bluetooth
   */
  getDevice$() {
    return this.bluetoothService.getDevice$();
  }
  /**
   * get the current device battery level
   */
  getBatteryLevel$() {
    return this.bluetoothService.getBatteryLevel$();
  }

  // #endregion

  // #region Authentication MIFARE SL3
  readCard$() {
    this.readCardAttempts++;
    if (this.readCardAttempts >= 10) {
      return Rx.of({ status: 'TIMEOUT' });
    } else if (!this.readingCard) {
      this.readingCard = true;
      this.conversation.id = uuid();
      localStorage.conversationId = this.conversation.id;
      return this.myfarePlusSl3.readCurrentCard$(
        this.bluetoothService,
        this.readerAcr1255,
        this.sessionKey,
        this.cypherAesService,
        this.conversation,
        this.gateway,
        'PUBLIC'
      ).pipe(
        delay(500),
        mergeMap(cardNumberResult => {
        console.log('PUBLIC: ', cardNumberResult);
        return this.myfarePlusSl3.readCurrentCard$(
          this.bluetoothService,
          this.readerAcr1255,
          this.sessionKey,
          this.cypherAesService,
          this.conversation,
          this.gateway,
          'CIVICA'
        ).pipe(
          map(result => {
            console.log('CIVICA: ', result);
          (result as any).result.numeroTarjetaPublico = (cardNumberResult as any).result.numeroTarjetaPublico;
          return result;
          })
        );
        })
      );
    }
    return Rx.of({status: 'READING'});
  }

  // #endregion

  purchaseCivicaCardReload$(reloadValue) {
    return this.gateway.apollo
      .mutate<any>({
        mutation: purchaseCivicaCardReload,
        variables: {
          conversationId: this.conversation.id,
          value: parseInt(reloadValue, 0)
        },
        errorPolicy: 'all'
      })
      .pipe(
        map(rawData =>
          JSON.parse(
            JSON.stringify(
              rawData.data.purchaseCivicaCardReload
            )
          )
        )
      );
  }

  changeOperationState$(uiState) {
    console.log('Conversation id: ', this.conversation);
    return this.gateway.apollo
    .mutate<any>({
      mutation: setCivicaCardReloadConversationUiState,
      variables: {
        conversationId: this.conversation.id,
        uiState: uiState
      },
      errorPolicy: 'all'
    })
    .pipe(
      map(rawData => rawData.data.setCivicaCardReloadConversationUiState)
    );
  }

}
