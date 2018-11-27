import { Component, OnInit } from '@angular/core';
import { AfccRealoderService } from '../../afcc-realoder.service';
import { OperabilityState } from '../../utils/operability-sate';

@Component({
  selector: 'app-reload-card-aborted',
  templateUrl: './reload-card-aborted.component.html',
  styleUrls: ['./reload-card-aborted.component.scss']
})
export class ReloadCardAbortedComponent implements OnInit {

  constructor(private afccReloaderService: AfccRealoderService) { }

  ngOnInit() {
  }

  backToHome() {
    this.afccReloaderService.operabilityState$.next(OperabilityState.CONNECTED);
  }

}
