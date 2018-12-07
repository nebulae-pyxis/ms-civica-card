import { Component, OnInit } from '@angular/core';
import { AfccRealoderService } from '../../afcc-realoder.service';
import { OperabilityState } from '../../utils/operability-sate';

@Component({
  selector: 'app-reload-card-error',
  templateUrl: './reload-card-error.component.html',
  styleUrls: ['./reload-card-error.component.scss']
})
export class ReloadCardErrorComponent implements OnInit {

  errorType;
  constructor(private afccReloaderService: AfccRealoderService) { }

  ngOnInit() {
    this.errorType = this.afccReloaderService.conversation.error;
  }

  retry() {
    this.afccReloaderService.operabilityState$.next(OperabilityState.RELOADING_CARD);
  }

  abort() {
    this.afccReloaderService.cardReloadAborted$.next(this.afccReloaderService.conversation);
    this.afccReloaderService.operabilityState$.next(OperabilityState.RELOAD_CARD_ABORTED);
  }

}
