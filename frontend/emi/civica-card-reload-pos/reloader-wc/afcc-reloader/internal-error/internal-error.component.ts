import { Component, OnInit } from '@angular/core';
import { AfccRealoderService } from '../../afcc-realoder.service';
import { OperabilityState } from '../../utils/operability-sate';

@Component({
  selector: 'app-internal-error',
  templateUrl: './internal-error.component.html',
  styleUrls: ['./internal-error.component.scss']
})
export class InternalErrorComponent implements OnInit {

  errorType = 'DEFAULT';
  constructor(private afccReloaderService: AfccRealoderService) { }

  ngOnInit() {
    const error = this.afccReloaderService.conversation.error;
    if (error === 'INVALID_SESSION') {
      this.errorType = error;
    }
  }
  retry() {
    this.afccReloaderService.operabilityState$.next(OperabilityState.CONNECTED);
  }
}
