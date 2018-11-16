import { Component, OnInit } from '@angular/core';
import { AfccRealoderService } from '../../afcc-realoder.service';
import { OperabilityState } from '../../utils/operability-sate';
import { BehaviorSubject } from 'rxjs';

@Component({
  selector: 'app-reload-card-refused',
  templateUrl: './reload-card-refused.component.html',
  styleUrls: ['./reload-card-refused.component.scss']
})
export class ReloadCardRefusedComponent implements OnInit {

  operationState;
  error = new BehaviorSubject<String>('');
  constructor(private afccReloaderService: AfccRealoderService) { }

  ngOnInit() {
    this.error.next(this.afccReloaderService.conversation.error);
    this.operationState = this.afccReloaderService.operabilityState$.value;
  }

  retry() {
    this.afccReloaderService.operabilityState$.next(OperabilityState.CONNECTED);
  }

}
