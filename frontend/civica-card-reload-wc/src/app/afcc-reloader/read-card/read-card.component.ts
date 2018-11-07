import { Component, OnInit, OnDestroy } from '@angular/core';
import { AfccRealoderService } from '../../afcc-realoder.service';
import { OperabilityState } from '../../utils/operability-sate';
import { MatDialog } from '@angular/material';
import { ReloadConfirmationDialogComponent } from './reload-confirmation-dialog/reload-confirmation-dialog.component';
import { interval, of, Subject } from 'rxjs';
import { mergeMap, catchError, tap, takeUntil } from 'rxjs/operators';
import { v4 as uuid } from 'uuid';

@Component({
  selector: 'app-read-card',
  templateUrl: './read-card.component.html',
  styleUrls: ['./read-card.component.scss']
})
export class ReadCardComponent implements OnInit, OnDestroy {
  value = '0';
  readIntervalObj;
  operationState;
  private ngUnsubscribe = new Subject();
  constructor(
    private afccReloadService: AfccRealoderService,
    private dialog: MatDialog
  ) {}

  ngOnInit() {
    console.log('new uid: ', uuid());
    interval(2000)
      .pipe(
        mergeMap(() =>
          this.afccReloadService.readCard$().pipe(
          catchError(error => {
            console.log('FALLO: ', error);
              this.afccReloadService.readingCard = false;
              return of('Error reading the card: ', error);
            })
          )
        ),
      tap(result => {
        if ((result as any).status === 'COMPLETED') {
          this.afccReloadService.readingCard = false;
          this.afccReloadService.readCardAttempts = 0;
          this.ngUnsubscribe.next();
          this.afccReloadService.operabilityState$.next(OperabilityState.CARD_READED);
        } else if ((result as any).status === 'TIMEOUT') {
          this.afccReloadService.readingCard = false;
          this.afccReloadService.readCardAttempts = 0;
          this.ngUnsubscribe.next();
          this.readCardError();
        }
      }),
      takeUntil(this.ngUnsubscribe)
      )
      .subscribe(result => {
        console.log('SE COMPLETA Y LLEGA RESULTADO!!!!!!!!!!!!!!!');
      },
      error => { },
      () => {
        this.afccReloadService.readCardAttempts = 0;
        this.afccReloadService.readingCard = false;
      });
    this.afccReloadService.operabilityState$.subscribe(state => {
      this.operationState = state;
    });
    this.afccReloadService.cardRead$.next('Here card readed info');
  }

  ngOnDestroy() {
    this.ngUnsubscribe.next();
    this.ngUnsubscribe.complete();
  }

  readCardError() {
    this.afccReloadService.operabilityState$.next(
      OperabilityState.READING_CARD_ERROR
    );
  }

  internalError() {
    this.afccReloadService.operabilityState$.next(
      OperabilityState.INTERNAL_ERROR
    );
  }

  reloadCard() {
    this.dialog
      .open(ReloadConfirmationDialogComponent, {
        width: '500px',
        data: this.value
      })
      .afterClosed()
      .subscribe(result => {
        if (result) {
          this.afccReloadService.operabilityState$.next(
            OperabilityState.RELOADING_CARD
          );
          this.afccReloadService.conversation.reloadValue = this.value;
        }
      });
  }

  cancelReloadCard() {
    this.afccReloadService.operabilityState$.next(OperabilityState.CONNECTED);
  }

  reloadCardShortCut(value) {
    this.value = value;
    this.dialog
      .open(ReloadConfirmationDialogComponent, {
        width: '500px',
        data: this.value
      })
      .afterClosed()
      .subscribe(result => {
        if (result) {
          this.afccReloadService.operabilityState$.next(
            OperabilityState.RELOADING_CARD
          );
          this.afccReloadService.conversation.reloadValue = this.value;
        }
      });
  }
}
