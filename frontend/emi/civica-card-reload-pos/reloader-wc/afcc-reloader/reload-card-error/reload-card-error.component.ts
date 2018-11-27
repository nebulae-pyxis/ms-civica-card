import { Component, OnInit } from '@angular/core';
import { AfccRealoderService } from '../../afcc-realoder.service';
import { OperabilityState } from '../../utils/operability-sate';

@Component({
  selector: 'app-reload-card-error',
  templateUrl: './reload-card-error.component.html',
  styleUrls: ['./reload-card-error.component.scss']
})
export class ReloadCardErrorComponent implements OnInit {

  constructor(private afccReloaderService: AfccRealoderService) { }

  ngOnInit() {
  }

  retry() {
    this.afccReloaderService.operabilityState$.next(OperabilityState.RELOADING_CARD);
  }

  abort() {
    this.afccReloaderService.cardReloadAborted$.next('Here current card information with part of the conversation');
    this.afccReloaderService.operabilityState$.next(OperabilityState.RELOAD_CARD_ABORTED);
  }

}
