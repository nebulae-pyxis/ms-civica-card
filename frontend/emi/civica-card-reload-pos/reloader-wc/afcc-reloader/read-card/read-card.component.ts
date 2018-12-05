import { Component, OnInit, OnDestroy, ElementRef } from '@angular/core';
import { AfccRealoderService } from '../../afcc-realoder.service';
import { OperabilityState } from '../../utils/operability-sate';
import { MatDialog, MatSnackBar } from '@angular/material';
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
  prevValidValue;
  private ngUnsubscribe = new Subject();
  constructor(
    private afccReloadService: AfccRealoderService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit() {
    const newConversation = {
      posId: this.afccReloadService.conversation.posId,
      posTerminal: this.afccReloadService.posTerminal,
      posUserId: this.afccReloadService.posUserId,
      posUserName: this.afccReloadService.posUserName,
      readerType: this.afccReloadService.readerType,
      position: this.afccReloadService.posPosition
    };
    this.afccReloadService.conversation = newConversation;
    this.readCard();
    interval(2000)
      .pipe(takeUntil(this.ngUnsubscribe))
      .subscribe(
        () => {
          if (!this.afccReloadService.readingCard) {
            this.readCard();
          }
        },
        error => {},
        () => {
          this.afccReloadService.readCardAttempts = 0;
          this.afccReloadService.readingCard = false;
        }
      );
    this.afccReloadService.operabilityState$.subscribe(state => {
      this.operationState = state;
    });
    this.afccReloadService.cardRead$.next('Here card readed info');
  }


  onReloadValueChanged(event: any) {
    const intValue = parseInt(event.target.value.replace(/,/g, '').replace('$', ''));
    if (intValue <= 50000) {
      this.prevValidValue = intValue;
    } else {
      this.openSnackBar('Monto máximo es $50,000');
      this.value = this.prevValidValue;
    }
  }


  readCard() {
    this.afccReloadService
      .readCard$()
      .pipe(
      catchError(error => {
        delete this.afccReloadService.conversation.cardUid;
        this.afccReloadService.readingCard = false;
        console.log('Error leyendo tarjeta: ', error);
          if (error.toString().indexOf('CARD_NOT_SUPPORTED') !== -1) {
            this.afccReloadService.conversation.error =
              'CARD_READED_NOT_SUPPORTED';
            this.afccReloadService.operabilityState$.next(
              OperabilityState.READING_CARD_ERROR
            );
          } else if (error.toString().indexOf('INVALID_SESSION') !== -1) {
            this.afccReloadService.conversation.error = 'INVALID_SESSION';
            this.afccReloadService.operabilityState$.next(
              OperabilityState.INTERNAL_ERROR
            );
          }
          else if (error.toString().indexOf('BUSINESS_NOT_FOUND') !== -1) {
            this.afccReloadService.readCardAttempts = 10;
            this.afccReloadService.conversation.error = 'BUSINESS_NOT_FOUND';
            this.readCardError();
          } else if (error.toString().indexOf('CIVICA_CARD_CORRUPTED_DATA') !== -1) {
            this.afccReloadService.readCardAttempts = 10;
            this.afccReloadService.conversation.error = 'CIVICA_CARD_CORRUPTED_DATA';
          } else if (error.toString().indexOf('CIVICA_CARD_WRITE_FAILED') !== -1) {
            this.afccReloadService.readCardAttempts = 10;
            this.afccReloadService.conversation.error = 'CIVICA_CARD_WRITE_FAILED';
            this.readCardError();
          } else if (error.toString().indexOf('CIVICA_CARD_AUTH_FAILED') !== -1) {
            this.afccReloadService.readCardAttempts = 10;
            this.afccReloadService.conversation.error = 'CIVICA_CARD_AUTH_FAILED';
            this.readCardError();
          } else if (error.toString().indexOf('BUSINESS_WALLET_SPENDING_FORBIDDEN') !== -1) {
            this.afccReloadService.readCardAttempts = 10;
            this.afccReloadService.conversation.error = 'BUSINESS_WALLET_SPENDING_FORBIDDEN';
            this.readCardError();
          }
          else if (error.toString().indexOf('BUSINESS_NOT_ACTIVE') !== -1) {
            this.afccReloadService.readCardAttempts = 10;
            this.afccReloadService.conversation.error = 'BUSINESS_NOT_ACTIVE';
            this.readCardError();
          }
          return of('Error reading the card: ', error);
        })
      )
      .subscribe(data => {
        if ((data as any).status === 'COMPLETED') {
          this.afccReloadService.readingCard = false;
          this.afccReloadService.readCardAttempts = 0;
          this.ngUnsubscribe.next();
          this.balance = data.result._saldoConsolidado;
          // TODO: Se debe cambiar por el estado real de la tarjeta
          this.state = 'OK';
          this.afccReloadService.currentCardReaded$.next(data.result);
          this.afccReloadService.operabilityState$.next(
            OperabilityState.CARD_READED
          );
        } else if ((data as any).status === 'TIMEOUT') {
          this.afccReloadService.readingCard = false;
          this.afccReloadService.readCardAttempts = 0;
          this.ngUnsubscribe.next();
          this.readCardError();
        }
      }, error => {

      }, () => {
        console.log('!!!!!!!!!! Se completa el OBS');
      });
  }

  ngOnDestroy() {
    if (this.dialog) {
      this.dialog.closeAll();
    }
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
    if (parseInt(this.value, 0) < 1000) {
      this.openSnackBar('Monto de recarga invalido');
    } else {
      this.dialog
        .open(ReloadConfirmationDialogComponent, {
          width: '500px',
          data: this.value
        })
        .afterClosed()
        .pipe(
          mergeMap(granted => {
            if (granted) {
              this.afccReloadService.operabilityState$.next(
                OperabilityState.REQUESTING_RELOAD_PERMISSION
              );
              this.afccReloadService.conversation.reloadValue = this.value;
              return this.afccReloadService.purchaseCivicaCardReload$(
                this.value
              );
            } else {
              return of('Operation cancelled');
            }
          })
        )
        .subscribe(
          result => {
            if (result.granted) {
              this.afccReloadService.conversation.purchase = result;
              this.afccReloadService.operabilityState$.next(
                OperabilityState.RELOADING_CARD
              );
            }
          },
          error => {
            this.afccReloadService.conversation.error = error
              .toString()
              .replace(/Error: /g, '');
            this.afccReloadService.operabilityState$.next(
              OperabilityState.RELOAD_CARD_REFUSED
            );
          }
        );
    }
  }

  cancelReloadCard() {
    this.afccReloadService.operabilityState$.next(OperabilityState.CONNECTED);
  }

  reloadCardShortCut(value) {
    this.value = value;
    this.reloadCard();
  }

  openSnackBar(text) {
    this.snackBar.open(text, 'Cerrar', { duration: 2000 });
  }
}
