import { Component, OnInit, ViewChild, ElementRef, OnDestroy } from '@angular/core';
import { AfccRealoderService } from '../../afcc-realoder.service';
import { catchError, takeUntil } from 'rxjs/operators';
import * as Rx from 'rxjs';
import { ConnectionStatus } from '../../utils/connection-status';
import { MatSnackBar } from '@angular/material';
import { OperabilityState } from '../../utils/operability-sate';

@Component({
  selector: 'app-bluetooth-connection',
  templateUrl: './bluetooth-connection.component.html',
  styleUrls: ['./bluetooth-connection.component.scss']
})
export class BluetoothConnectionComponent implements OnInit, OnDestroy {

  jwtTest;
  operabilityState$ = new Rx.BehaviorSubject<OperabilityState>(OperabilityState.DISCONNECTED);
  ngUnsubscribe = new Rx.Subject<any>();
  constructor(
    private afccReloaderService: AfccRealoderService,
    private snackBar: MatSnackBar
  ) { }

  ngOnInit() {
  }

  ngOnDestroy(): void {
    this.ngUnsubscribe.next();
    this.ngUnsubscribe.complete();
  }

  refreshJwt() {
    this.afccReloaderService.gateway.token = this.jwtTest;
  }

  connect() {
    this.afccReloaderService.operabilityState$.next(OperabilityState.CONNECTING);
    this.afccReloaderService.operabilityState$.pipe(
      takeUntil(this.ngUnsubscribe)
    )
      .subscribe(state => {
      this.operabilityState$.next(state);
    });
  }


  disconnectDevice() {
    this.afccReloaderService.disconnectDevice();
  }


  openSnackBar(text) {
    this.snackBar.open(text, 'Cerrar', { duration: 2000 });
  }

}
