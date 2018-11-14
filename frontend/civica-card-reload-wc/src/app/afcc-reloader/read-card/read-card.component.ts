import { Component, OnInit, OnDestroy, ElementRef } from '@angular/core';
import { AfccRealoderService } from '../../afcc-realoder.service';
import { OperabilityState } from '../../utils/operability-sate';
import { MatDialog } from '@angular/material';
import { ReloadConfirmationDialogComponent } from './reload-confirmation-dialog/reload-confirmation-dialog.component';
import { interval, of, Subject, BehaviorSubject } from 'rxjs';
import { mergeMap, catchError, tap, takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-read-card',
  templateUrl: './read-card.component.html',
  styleUrls: ['./read-card.component.scss']
})
export class ReadCardComponent implements OnInit, OnDestroy {
  value = '0';
  readIntervalObj;
  operationState;
  balance;
  state;
  private ngUnsubscribe = new Subject();
  constructor(
    private afccReloadService: AfccRealoderService,
    private dialog: MatDialog
  ) {}

  ngOnInit() {
    const newConversation = {
      posId: this.afccReloadService.conversation.posId,
      posTerminal: this.afccReloadService.conversation.posTerminal,
      posUserId: this.afccReloadService.conversation.posUserId,
      posUserName: this.afccReloadService.conversation.posUserName,
      readerType: this.afccReloadService.readerType,
      position: this.afccReloadService.conversation.position
    };
    this.afccReloadService.conversation = newConversation;
    interval(2000)
      .pipe(
        takeUntil(this.ngUnsubscribe)
      )
      .subscribe(() => {
        if (!this.afccReloadService.readingCard) {
        this.afccReloadService.readCard$().pipe(
          catchError(error => {
            console.log('error: ', error);
            this.afccReloadService.readingCard = false;
            if (error === 'card not supported') {
              this.afccReloadService.operabilityState$.next(OperabilityState.CARD_READED_NOT_SUPPORTED);
            }
            return of('Error reading the card: ', error);
          })
        ).subscribe(data => {
          if ((data as any).status === 'COMPLETED') {
            this.afccReloadService.readingCard = false;
            this.afccReloadService.readCardAttempts = 0;
            this.ngUnsubscribe.next();
            console.log('llega result: ', data);
            if ((data as any).result.cardNumber) {
               this.balance = (data.result._saldoTarjeta);
               this.state = (data.result.numeroTarjetaPublico);
              this.afccReloadService.currentCardReaded$.next(data.result);
            }
            this.afccReloadService.operabilityState$.next(OperabilityState.CARD_READED);
          } else if ((data as any).status === 'TIMEOUT') {
            this.afccReloadService.readingCard = false;
            this.afccReloadService.readCardAttempts = 0;
            this.ngUnsubscribe.next();
            this.readCardError();
          }
        });
      }
      },
      error => {
      },
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
