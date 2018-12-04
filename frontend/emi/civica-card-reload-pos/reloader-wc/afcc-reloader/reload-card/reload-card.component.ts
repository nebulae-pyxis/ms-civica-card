import { Component, OnInit } from '@angular/core';
import { AfccRealoderService } from '../../afcc-realoder.service';
import { OperabilityState } from '../../utils/operability-sate';
import { ReloadState } from '../../utils/reload-state';
import { interval, BehaviorSubject } from 'rxjs';
import { mergeMap, tap, map } from 'rxjs/operators';

@Component({
  selector: 'app-reload-card',
  templateUrl: './reload-card.component.html',
  styleUrls: ['./reload-card.component.scss']
})
export class ReloadCardComponent implements OnInit {
  receipt;
  reloadState$ = new BehaviorSubject<ReloadState>(ReloadState.READING);
  constructor(private afccReloaderService: AfccRealoderService) {}

  ngOnInit() {
    this.receipt = this.afccReloaderService.conversation.purchase.receipt;
    this.afccReloaderService.writeCard$().subscribe(result => {
      this.reloadCardSuccessfully();
    },
      error => {
        console.log('llega error de escritura: ', error);
        if (error.toString().indexOf('INVALID_CARD_TO_RELOAD') !== -1) {
          this.afccReloaderService.conversation.error =
            'INVALID_CARD_TO_RELOAD';
        }
        this.reloadCardError();
      });
  }

  refreshReloadState$() {
    return this.reloadState$.pipe(
      tap(state => {
        this.afccReloaderService.conversation.reloadState = state;
      }),
      map(state => {
        switch (state) {
          case ReloadState.READING:
            return 'Leyendo';
          case ReloadState.VERIFING:
            return 'Verificando';
          case ReloadState.WRITING:
            return 'Escribiendo';
          case ReloadState.SUCCESS:
            return 'Venta exitosa';
          case ReloadState.ERROR:
            return 'Error';
        }
      })
    );
  }

  reloadCardError() {
    this.afccReloaderService.operabilityState$.next(
      OperabilityState.RELOADING_CARD_ERROR
    );
  }

  reloadCardSuccessfully() {
    this.afccReloaderService.operabilityState$.next(
      OperabilityState.RELOAD_CARD_SUCCESS
    );
  }
}
