import { Component, OnInit } from '@angular/core';
import { AfccRealoderService } from '../../afcc-realoder.service';
import { OperabilityState } from '../../utils/operability-sate';

@Component({
  selector: 'app-reload-card-successfully',
  templateUrl: './reload-card-successfully.component.html',
  styleUrls: ['./reload-card-successfully.component.scss']
})
export class ReloadCardSuccessfullyComponent implements OnInit {
  receipt;
  constructor(private afccReloaderService: AfccRealoderService) { }

  ngOnInit() {
    this.receipt = this.afccReloaderService.conversation.purchase.receipt;
    this.afccReloaderService.cardReloadDone$.next(this.receipt);
  }

  retry() {
    this.afccReloaderService.operabilityState$.next(OperabilityState.CONNECTED);
  }

}
