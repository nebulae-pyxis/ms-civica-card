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
  reloadValue;
  finalValue;
  reloadState$ = new BehaviorSubject<ReloadState>(ReloadState.READING);
  constructor(private afccReloaderService: AfccRealoderService) {}

  ngOnInit() {
    // TODO: Must request the sale authorizaton to the backend before write the card
    this.afccReloaderService.saleAuthorization$.next('Here the sale authorization received');
    this.reloadValue = this.afccReloaderService.conversation.reloadValue;
    const sub = interval(2000)
      .subscribe(() => {
      switch (this.reloadState$.value) {
        case ReloadState.READING:
          this.reloadState$.next(ReloadState.WRITING);
          break;
        case ReloadState.VERIFING:
          const rnd = Math.floor(Math.random() * 100 + 1);
          if (rnd <= 50) {
            this.reloadState$.next(ReloadState.SUCCESS);
          } else {
            this.reloadState$.next(ReloadState.ERROR);
          }
          break;
        case ReloadState.WRITING:
        this.reloadState$.next(ReloadState.VERIFING);
          break;
        case ReloadState.SUCCESS:
          this.finalValue = this.reloadValue + 1200;
          this.afccReloaderService.conversation.finalValue = this.finalValue;
          this.afccReloaderService.receipt$.next('here reload receipt');
          sub.unsubscribe();
          this.reloadCardSuccessfully();
          break;
        case ReloadState.ERROR:
          sub.unsubscribe();
          this.reloadCardError();
          break;
      }
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
