import { Injectable } from '@angular/core';
import { OperabilityState } from './utils/operability-sate';
import { BehaviorSubject, Subscription } from 'rxjs';
import { BluetoothService } from '@nebulae/angular-ble';
import { ConnectionStatus } from './utils/connection-status';
import { CypherAes } from './utils/cypher-aes';
import { ReaderAcr1255 } from './utils/readers/reader-acr1255';
import * as Rx from 'rxjs';
import {
  switchMap,
  mergeMap,
  takeUntil,
  filter,
  map,
  tap,
  delay,
  mapTo,
  catchError
} from 'rxjs/operators';
import { GatewayService } from './api/gateway.service';
import { MyfarePlusSl3 } from './utils/cards/mifare-plus-sl3';
import {
  purchaseCivicaCardReload,
  setCivicaCardReloadConversationUiState,
  CivicaCardReloadConversation,
  getMasterKeyReloader
} from './api/gql/afcc-reloader.js';
import { v4 as uuid } from 'uuid';
import { CardPowerOnResp } from './utils/communication_profile/messages/response/card-power-on-resp';

@Injectable({
  providedIn: 'root'
})
export class AfccRealoderService {
  operabilityState$ = new BehaviorSubject<OperabilityState>(
    OperabilityState.UNKNOWN_POSITION
  );
  posPosition;
  posTerminal;
  posUserId;
  posUserName;
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

  constructor(
    private bluetoothService: BluetoothService,
    public gateway: GatewayService
  ) {
    this.cypherAesService = new CypherAes();
    this.readerAcr1255 = new ReaderAcr1255();
    this.myfarePlusSl3 = new MyfarePlusSl3();

    this.operabilityState$.subscribe(operabilityState => {
      if (
        operabilityState === OperabilityState.RELOADING_CARD ||
        operabilityState === OperabilityState.RELOADING_CARD_ERROR ||
        operabilityState === OperabilityState.RELOAD_CARD_ABORTED ||
        operabilityState === OperabilityState.RELOAD_CARD_SUCCESS
      ) {
        this.conversation.state = operabilityState;
      }
    });
  }

  isBluetoothAvailable() {
    return this.bluetoothService.isBluetoothAvailable();
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
    this.readerType = 'ACR1255';
    return Rx.defer(() => {
      this.changeCypherMasterKey(Array.from(sessionKey));
      this.deviceConnectionStatus$.next(ConnectionStatus.CONNECTED);
      this.operabilityState$.next(OperabilityState.CONNECTED);
      return Rx.of('connection succeful');
    }).pipe(
      mergeMap(() => {
        return this.gateway.apollo
          .query<any>({
            query: CivicaCardReloadConversation,
            variables: {
              id: localStorage.conversationId
            },
            errorPolicy: 'all',
            fetchPolicy: 'network-only'
          })
          .pipe(
            catchError(error => {
              return Rx.of(undefined);
            })
          );
      }),
      map(rawData => {
        if (rawData) {
          return JSON.parse(
            JSON.stringify(rawData.data.CivicaCardReloadConversation)
          );
        }
      }),
      tap(result => {
        if (
          result &&
          ((result as any).uiState === OperabilityState.RELOADING_CARD ||
            (result as any).uiState === OperabilityState.RELOADING_CARD_ERROR)
        ) {
          this.conversation = result;
          this.operabilityState$.next(OperabilityState.RELOADING_CARD);
        }
      })
    );
  }

  getReaderKey() {
    return this.gateway.apollo
    .query<any>({
      query: getMasterKeyReloader,
      errorPolicy: 'all',
      fetchPolicy: 'network-only'
      }).pipe(
      map(result => {
        this.keyReader = result.data.getMasterKeyReloader.key;
        this.cypherAesService.config(this.keyReader);
        return this.keyReader;
      })
    );
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
      return this.myfarePlusSl3
        .cardPowerOn$(
          this.bluetoothService,
          this.readerAcr1255,
          this.cypherAesService,
          this.sessionKey
        )
        .pipe(
          mergeMap(cardPowerOnResult => {
          const cardPowerOnResp = new CardPowerOnResp(cardPowerOnResult);
            if (
              this.cypherAesService.bytesTohex(
                cardPowerOnResp.data.slice(3, 5)
              ) === '01c1'
            ) {
              return this.myfarePlusSl3
                .readCurrentCard$(
                  this.bluetoothService,
                  this.readerAcr1255,
                  this.sessionKey,
                  this.cypherAesService,
                  this.conversation,
                  this.gateway,
                  'PUBLIC',
                  'SL3'
                )
                .pipe(
                  delay(500),
                  mergeMap(cardNumberResult => {
                    return this.myfarePlusSl3
                      .cardPowerOn$(
                        this.bluetoothService,
                        this.readerAcr1255,
                        this.cypherAesService,
                        this.sessionKey
                      )
                      .pipe(
                        mergeMap(() => {
                          return this.myfarePlusSl3.readCurrentCard$(
                            this.bluetoothService,
                            this.readerAcr1255,
                            this.sessionKey,
                            this.cypherAesService,
                            this.conversation,
                            this.gateway,
                            'CIVICA',
                            'SL3'
                          );
                        }),
                        map(result => {
                          (result as any).result.numeroTarjetaPublico = (cardNumberResult as any).result.numeroTarjetaPublico;
                          return result;
                        })
                      );
                  })
                );
            } else if (
              this.cypherAesService.bytesTohex(
                cardPowerOnResp.data.slice(13, 15)
              ) === '0001' || this.cypherAesService.bytesTohex(
                cardPowerOnResp.data.slice(13, 15)
              ) === 'ff88'
            ) {
              return this.myfarePlusSl3.readCurrentCard$(
                this.bluetoothService,
                this.readerAcr1255,
                this.sessionKey,
                this.cypherAesService,
                this.conversation,
                this.gateway,
                'CIVICA',
                'SL1'
              );
            } else if (
              !this.cypherAesService.bytesTohex(
                cardPowerOnResp.data.slice(3, 5)
              )
            ) {
              throw new Error('CARD_NOT_FOUND');
            } else {
              throw new Error('CARD_NOT_SUPPORTED');
            }
          })
        );
    }
    return Rx.of({ status: 'READING' });
  }

  writeCard$() {
    return this.myfarePlusSl3.writeCurrentCard$(
      this.bluetoothService,
      this.readerAcr1255,
      this.sessionKey,
      this.cypherAesService,
      this.conversation,
      this.gateway
    );
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
        map(rawData => {
          if (rawData.errors) {
            throw new Error(rawData.errors[0].message.method);
          } else {
            return JSON.parse(
              JSON.stringify(rawData.data.purchaseCivicaCardReload)
            );
          }
        })
      );
  }

  changeOperationState$(uiState) {
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
