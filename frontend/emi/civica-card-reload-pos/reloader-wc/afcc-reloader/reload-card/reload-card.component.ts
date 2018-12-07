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
        if (error.toString().indexOf('INVALID_CARD_TO_RELOAD') !== -1) {
          this.afccReloaderService.conversation.error =
            'Tarjeta ingresada no coincide con la anteriormente leida';
        } else if (error.toString().indexOf('BUSINESS_NOT_FOUND') !== -1) {
          this.afccReloaderService.conversation.error =
            'Unidad de negocio no encontrada, por favor comuníquese con administración para solucionar este problema';
        }
        else if (error.toString().indexOf('BUSINESS_NOT_ACTIVE') !== -1) {
          this.afccReloaderService.conversation.error =
            ' Unidad de negocio inactiva, por favor comuníquese con administración para solucionar este problema';
        }
        else if (error.toString().indexOf('BUSINESS_WALLET_NOT_FOUND') !== -1) {
          this.afccReloaderService.conversation.error =
          'Su unidad de negocio no se encuentra con una billetera activa, , por favor comuníquese con administración para solucionar este problema';
        }
        else if (error.toString().indexOf('BUSINESS_WALLET_SPENDING_FORBIDDEN') !== -1) {
          this.afccReloaderService.conversation.error =
            'Saldo insuficiente para realizar la operación';
        }
        else if (error.toString().indexOf('INVALID_SESSION') !== -1) {
          this.afccReloaderService.conversation.error =
            'Error obteniendo información del servidor, por favor intentelo nuevamente';
        }
        else {
          this.afccReloaderService.conversation.error =
            'Sesión de usuario inválida, por favor comuníquese con soporte para verificar y solucionar este error';
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
