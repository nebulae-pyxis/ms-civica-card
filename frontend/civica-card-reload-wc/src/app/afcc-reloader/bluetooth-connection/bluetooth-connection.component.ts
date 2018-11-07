import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { AfccRealoderService } from '../../afcc-realoder.service';
import { catchError } from 'rxjs/operators';
import * as Rx from 'rxjs';
import { ConnectionStatus } from '../../utils/connection-status';
import { MatSnackBar } from '@angular/material';
import { OperabilityState } from '../../utils/operability-sate';

@Component({
  selector: 'app-bluetooth-connection',
  templateUrl: './bluetooth-connection.component.html',
  styleUrls: ['./bluetooth-connection.component.scss']
})
export class BluetoothConnectionComponent implements OnInit {


  constructor(
    private afccReloaderService: AfccRealoderService,
    private snackBar: MatSnackBar
  ) { }

  ngOnInit() {
  }

  connect() {
    this.afccReloaderService.operabilityState$.next(OperabilityState.CONNECTING);
  }


  disconnectDevice() {
    this.afccReloaderService.disconnectDevice();
  }


  openSnackBar(text) {
    this.snackBar.open(text, 'Cerrar', { duration: 2000 });
  }

}
