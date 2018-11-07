import { Component, OnInit, ViewEncapsulation, Input, Output, EventEmitter } from '@angular/core';
import { AfccRealoderService } from '../afcc-realoder.service';
import { BehaviorSubject, Subject } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { OperabilityState } from '../utils/operability-sate';
import { BackButtonDialogComponent } from './back-button-dialog/back-button-dialog.component';
import { MatDialog } from '@angular/material';
import { GatewayService } from '../api/gateway.service';
@Component({
  selector: 'afcc-reloader',
  templateUrl: './afcc-reloader.component.html',
  styleUrls: ['./afcc-reloader.component.scss']
})
export class AfccReloaderComponent implements OnInit {

  operabilityState$ = new BehaviorSubject<OperabilityState>(OperabilityState.DISCONNECTED);

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
  @Output() error = new Subject<any>();
  @Output() cardReloadAborted = new Subject<any>();
  @Output() cardReloadDone = new Subject<any>();
  @Output() reloaderConnected = new Subject<any>();
  @Output() reloaderStandByMode = new Subject<String>();
  @Output() reloaderWorkingMode = new Subject<String>();
  @Output() cardRead = new Subject<String>();
  @Output() saleAuthorization = new Subject<String>();
  @Output() operation = new Subject<String>();
  @Output() receipt = new Subject<String>();
  // #endregion

  // #region Data input
  @Input() jwt: String;
  @Input() rechargeValue: Number;
  @Input() enableReloadValueKeys = true;
  @Input() posId: String;
  @Input() position: any;
  // #endregion

  constructor(private afccRealoderService: AfccRealoderService,
    private dialog: MatDialog,
  ) {
   }
  ngOnInit() {
     this.afccRealoderService.gateway.token = this.jwt;
     this.afccRealoderService.gateway.initService();
    if (this.position) {
      this.afccRealoderService.conversation.position = this.position;
      this.afccRealoderService.operabilityState$.next(OperabilityState.DISCONNECTED);
    } else if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((position) => {
        const latitude = position.coords.latitude;
        const longitude = position.coords.longitude;
        this.afccRealoderService.conversation.position = { latitude, longitude };
        this.afccRealoderService.operabilityState$.next(OperabilityState.DISCONNECTED);
      }, error => {
        this.afccRealoderService.operabilityState$.next(OperabilityState.UNKNOWN_POSITION);
      });
    }
    console.log('pasa de localizacion');
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
       this.operabilityState$.next(state);
    });
  }

  showBackButton() {
    return this.operabilityState$.pipe(
      map(state => {
        this.afccRealoderService.operation$.next(state);
        return state === OperabilityState.READING_CARD || state === OperabilityState.CARD_READED
          || state === OperabilityState.READING_CARD_ERROR || state === OperabilityState.INTERNAL_ERROR
          || state === OperabilityState.RELOAD_CARD_SUCCESS || state === OperabilityState.RELOAD_CARD_ABORTED;
      })
    );
  }

  showDisconnectDevice() {
    return this.operabilityState$.pipe(
      map(state => {
        return state === OperabilityState.CONNECTED || state === OperabilityState.IDLE;
      })
    );
  }

  disconnectDevice() {
    this.afccRealoderService.disconnectDevice();
  }

  backToHome() {
    this.dialog.open(BackButtonDialogComponent, {
      data: {}
    })
      .afterClosed()
      .subscribe(result => {
        if (result) {
          this.operabilityState$.next(OperabilityState.CONNECTED);
        }
      });
  }

}
