import { Component, OnInit } from '@angular/core';
import { AfccRealoderService } from '../../afcc-realoder.service';
import { OperabilityState } from '../../utils/operability-sate';

@Component({
  selector: 'app-internal-error',
  templateUrl: './internal-error.component.html',
  styleUrls: ['./internal-error.component.scss']
})
export class InternalErrorComponent implements OnInit {

  constructor(private afccReloaderService: AfccRealoderService) { }

  ngOnInit() {
  }
  retry() {
    this.afccReloaderService.operabilityState$.next(OperabilityState.RELOADING_CARD);
  }
}
