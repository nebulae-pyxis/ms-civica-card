import { Component, OnInit } from '@angular/core';
import { AfccRealoderService } from '../../afcc-realoder.service';
import { OperabilityState } from '../../utils/operability-sate';

@Component({
  selector: 'app-read-card-error',
  templateUrl: './read-card-error.component.html',
  styleUrls: ['./read-card-error.component.scss']
})
export class ReadCardErrorComponent implements OnInit {

  operationState;
  constructor(private afccReloaderService: AfccRealoderService) { }

  ngOnInit() {
    if (this.afccReloaderService.conversation.error) {
      this.operationState = this.afccReloaderService.conversation.error;
    } else {
      this.operationState = this.afccReloaderService.operabilityState$.value;
    }
  }

  retry() {
    this.afccReloaderService.operabilityState$.next(OperabilityState.CONNECTED);
  }

}
