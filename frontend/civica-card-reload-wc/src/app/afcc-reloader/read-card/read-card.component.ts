import { Component, OnInit } from '@angular/core';
import { AfccRealoderService } from '../../afcc-realoder.service';
import { OperabilityState } from '../../utils/operability-sate';
import { MatDialog } from '@angular/material';
import { ReloadConfirmationDialogComponent } from './reload-confirmation-dialog/reload-confirmation-dialog.component';

@Component({
  selector: 'app-read-card',
  templateUrl: './read-card.component.html',
  styleUrls: ['./read-card.component.scss']
})
export class ReadCardComponent implements OnInit {

  value = '0';
  constructor(private afccReloadService: AfccRealoderService,
    private dialog: MatDialog) { }

  ngOnInit() {
    this.afccReloadService.cardRead$.next('Here card readed info');
  }

  readCardError() {
    this.afccReloadService.operabilityState$.next(OperabilityState.READING_CARD_ERROR);
  }

  internalError() {
    this.afccReloadService.operabilityState$.next(OperabilityState.INTERNAL_ERROR);
  }

  reloadCard() {
    this.dialog.open(ReloadConfirmationDialogComponent, {
      width: '500px',
      data: this.value
    }).afterClosed()
    .subscribe(result => {
      if (result) {
        this.afccReloadService.operabilityState$.next(OperabilityState.RELOADING_CARD);
        this.afccReloadService.conversation.reloadValue = this.value;
      }
    });
  }

  cancelReloadCard() {
    this.afccReloadService.operabilityState$.next(OperabilityState.CONNECTED);
  }

  reloadCardShortCut(value) {
    this.value = value;
    this.dialog.open(ReloadConfirmationDialogComponent, {
      width: '500px',
      data: this.value
    }).afterClosed()
      .subscribe(result => {
        if (result) {
          this.afccReloadService.operabilityState$.next(OperabilityState.RELOADING_CARD);
          this.afccReloadService.conversation.reloadValue = this.value;
        }
      });
  }

}
