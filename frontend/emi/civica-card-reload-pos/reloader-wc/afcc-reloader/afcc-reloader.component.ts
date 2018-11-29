import {
  Component,
  OnInit,
  ViewEncapsulation,
  Input,
  Output,
  EventEmitter,
  OnDestroy,
  ViewChild
} from '@angular/core';
import { AfccRealoderService } from '../afcc-realoder.service';
import { BehaviorSubject, Subject, Subscription } from 'rxjs';
import { map, tap, distinctUntilChanged } from 'rxjs/operators';
import { OperabilityState } from '../utils/operability-sate';
import { BackButtonDialogComponent } from './back-button-dialog/back-button-dialog.component';
import { MatDialog, MatSnackBar } from '@angular/material';
import { ConnectionStatus } from '../utils/connection-status';
import { KeycloakService } from 'keycloak-angular';
@Component({
  selector: 'afcc-reloader',
  templateUrl: './afcc-reloader.component.html',
  styleUrls: ['./afcc-reloader.component.scss']
})
export class AfccReloaderComponent implements OnInit, OnDestroy {
  operabilityState$ = new BehaviorSubject<OperabilityState>(
    OperabilityState.DISCONNECTED
  );
  _enable_reload_value_keys;
  _recharge_value;
  _pos_id;
  _width = '500';
  _height = '500';
  @Input()
  set width(width) {
    this._width = width;
  }
  get width() {
    return `${this._width}px`;
  }

  @Input()
  set height(height) {
    this._height = height;
  }
  get height() {
    return `${this._height}px`;
  }
  // #region EventListener (Data output)
  @Output()
  error = new Subject<any>();
  @Output()
  cardReloadAborted = new Subject<any>();
  @Output()
  cardReloadDone = new Subject<any>();
  @Output()
  reloaderConnected = new Subject<any>();
  @Output()
  reloaderStandByMode = new Subject<String>();
  @Output()
  reloaderWorkingMode = new Subject<String>();
  @Output()
  cardRead = new Subject<String>();
  @Output()
  saleAuthorization = new Subject<String>();
  @Output()
  operation = new Subject<String>();
  @Output()
  receipt = new Subject<String>();
  // #endregion

  // #region Data input
  @Input()
  @Input()
  set pos_id(pos_id) {
    this._pos_id = pos_id;
  }
  get pos_id() {
    return this._pos_id;
  }
  @Input()
  set recharge_value(recharge_value) {
    this._recharge_value = recharge_value;
  }
  get recharge_value() {
    return this._recharge_value;
  }
  @Input()
  set enable_reload_value_keys(enable_reload_value_keys) {
    this._enable_reload_value_keys = enable_reload_value_keys;
  }
  get enable_reload_value_keys() {
    return this._enable_reload_value_keys;
  }
  @Input()
  set position(position) {
    this.afccRealoderService.posPosition = position;
  }
  get position() {
    return this.afccRealoderService.posPosition;
  }
  @Input()
  set pos_user_name(posUserName) {
    this.afccRealoderService.posUserName = posUserName;
  }
  get pos_user_name() {
    return this.afccRealoderService.posUserName;
  }
  @Input()
  set pos_terminal(posTerminal) {
    this.afccRealoderService.posTerminal = posTerminal;
  }
  get pos_terminal() {
    return this.afccRealoderService.posTerminal;
  }
  @Input()
  set pos_user_id(posUserId) {
    this.afccRealoderService.posUserId = posUserId;
  }
  get pos_user_id() {
    return this.afccRealoderService.posUserId;
  }
  // #endregion

  connectionSub;

  constructor(
    private afccRealoderService: AfccRealoderService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
    private keycloakService: KeycloakService
  ) {}
  async ngOnInit() {
    this.afccRealoderService.gateway.initService();
    this.afccRealoderService.gateway.token = await this.keycloakService.getToken();
    if (this.position) {
      const arrPosition = this.position.split(',');
      this.afccRealoderService.conversation.position = {
        latitude: parseInt(arrPosition[0], 0),
        longitude: parseInt(arrPosition[1], 0)
      };
      this.afccRealoderService.operabilityState$.next(
        OperabilityState.DISCONNECTED
      );
    } else if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        position => {
          const latitude = position.coords.latitude;
          const longitude = position.coords.longitude;
          this.afccRealoderService.posPosition = {
            latitude,
            longitude
          };
          this.afccRealoderService.operabilityState$.next(
            OperabilityState.DISCONNECTED
          );
        },
        error => {
          this.afccRealoderService.operabilityState$.next(
            OperabilityState.UNKNOWN_POSITION
          );
        }
      );
    }
    this.afccRealoderService.error$.subscribe(val => {
      this.error.next(val);
    });
    this.afccRealoderService.cardReloadAborted$.subscribe(val => {
      this.cardReloadAborted.next(val);
    });
    this.afccRealoderService.cardReloadDone$.subscribe(val => {
      this.cardReloadDone.next(val);
    });
    this.afccRealoderService.reloaderConnected$.subscribe(val => {
      this.reloaderConnected.next(val);
    });
    this.afccRealoderService.reloaderStandByMode$.subscribe(val => {
      this.reloaderStandByMode.next(val);
    });
    this.afccRealoderService.operabilityState$.subscribe(state => {
      if (state === OperabilityState.CONNECTING) {
        this.stablishNewConnection();
      }
      if (state === OperabilityState.DISCONNECTED) {
        this.afccRealoderService.initBluetoothValues();
        this.initConversationValues();
      }
      if (state === OperabilityState.CONNECTED) {
        this.initConversationValues();
      }
      if (
        state === OperabilityState.REQUESTING_RELOAD_PERMISSION ||
        state === OperabilityState.READING_CARD_ERROR ||
        state === OperabilityState.CARD_READED ||
        state === OperabilityState.RELOADING_CARD ||
        state === OperabilityState.RELOADING_CARD_ERROR ||
        state === OperabilityState.RELOAD_CARD_ABORTED ||
        state === OperabilityState.RELOAD_CARD_SUCCESS ||
        state === OperabilityState.RELOAD_CARD_REFUSED
      ) {
        this.afccRealoderService.changeOperationState$(state).subscribe();
      }
      this.operabilityState$.next(state);
    });
  }

  ngOnDestroy(): void {
    if (this.connectionSub) {
      this.connectionSub.unsubscribe();
    }
  }

  getHeaderIcon$() {
    return this.operabilityState$.pipe(
      map(state => {
        switch (state) {
          case 'CONNECTED':
          case 'IDLE':
            return 'bluetooth_connected.svg';
          case 'DISCONNECTED':
          case 'CONNECTING':
            return 'bluetooth_disabled.svg';
          case 'READING_CARD_ERROR':
          case 'CARD_READED':
          case 'INTERNAL_ERROR':
            return 'check.svg';
          case 'RELOADING_CARD_ERROR':
          case 'RELOAD_CARD_ABORTED':
          case 'RELOAD_CARD_REFUSED':
            return 'warn.svg';
          case 'UNKNOWN_POSITION':
            return 'unknown_position.svg';
          case 'READING_CARD':
          case 'RELOADING_CARD':
            return 'card.svg';
          default:
            return 'bluetooth_connected.svg';
        }
      })
    );
  }

  getHeaderIconColor$() {
    return this.operabilityState$.pipe(
      map(state => {
        switch (state) {
          case 'CONNECTED':
          case 'READING_CARD':
          case 'RELOADING_CARD':
            return '#3f51b5';
          case 'DISCONNECTED':
          case 'CONNECTING':
          case 'RELOAD_CARD_ABORTED':
          case 'RELOAD_CARD_REFUSED':
          case 'RELOADING_CARD_ERROR':
          case 'UNKNOWN_POSITION':
            return '#F44336';
          case 'READING_CARD_ERROR':
          case 'INTERNAL_ERROR':
            return '#F59100';
          case 'IDLE':
            return '#838583';
          default:
            return '#3f51b5';
        }
      })
    );
  }

  initConversationValues() {
    this.afccRealoderService.posTerminal = this.pos_terminal;
    this.afccRealoderService.posUserName = this.pos_user_name;
    this.afccRealoderService.posUserId = this.pos_user_id;
    this.afccRealoderService.conversation = {
      posId: this.pos_id,
      posTerminal: this.afccRealoderService.posTerminal,
      posUserName: this.afccRealoderService.posUserName,
      posUserId: this.afccRealoderService.posUserId,
      position: this.afccRealoderService.posPosition
    };
  }

  stablishNewConnection() {
    this.connectionSub = this.afccRealoderService
      .stablishNewConnection$()
      .subscribe(
        status => {
          if (status === ConnectionStatus.IDLE) {
            this.afccRealoderService.reloaderStandByMode$.next(
              'reloader enter on standByMode'
            );
          } else if (status === ConnectionStatus.CONNECTED) {
            this.afccRealoderService.reloaderWorkingMode$.next(
              'reloader end the standByMode'
            );
          }
          const operabilityState: keyof typeof OperabilityState = status;
          this.operabilityState$.next(operabilityState as OperabilityState);
          this.afccRealoderService.deviceConnectionStatus$.next(
            status as String
          );
        },
        error => {
          this.afccRealoderService.disconnectDevice();
          this.openSnackBar('Fallo al comunicarse con la lectora');
          this.afccRealoderService.operabilityState$.next(
            OperabilityState.DISCONNECTED
          );
          this.afccRealoderService.deviceConnectionStatus$.next(
            ConnectionStatus.DISCONNECTED
          );
        },
        () => {
          this.afccRealoderService.disconnectDevice();
          this.afccRealoderService.operabilityState$.next(
            OperabilityState.DISCONNECTED
          );
          this.afccRealoderService.deviceConnectionStatus$.next(
            ConnectionStatus.DISCONNECTED
          );
        }
      );
  }

  showBackButton() {
    return this.operabilityState$.pipe(
      map(state => {
        this.afccRealoderService.operation$.next(state);
        return (
          state === OperabilityState.CARD_READED ||
          state === OperabilityState.RELOAD_CARD_SUCCESS
        );
      })
    );
  }

  showDisconnectDevice() {
    return this.operabilityState$.pipe(
      map(state => {
        return (
          state === OperabilityState.CONNECTED ||
          state === OperabilityState.IDLE
        );
      })
    );
  }

  disconnectDevice() {
    this.afccRealoderService.disconnectDevice();
    this.afccRealoderService.operabilityState$.next(
      OperabilityState.DISCONNECTED
    );
  }

  backToHome() {
    this.dialog
      .open(BackButtonDialogComponent, {
        data: {}
      })
      .afterClosed()
      .subscribe(result => {
        if (result) {
          this.afccRealoderService.operabilityState$.next(OperabilityState.CONNECTED);

        }
      });
  }

  openSnackBar(text) {
    this.snackBar.open(text, 'Cerrar', { duration: 2000 });
  }
}
