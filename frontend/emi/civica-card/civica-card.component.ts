import { civicaCardService } from './civica-card.service';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { fuseAnimations } from '../../../core/animations';
import { Subscription } from 'rxjs/Subscription';
import * as Rx from 'rxjs/Rx';

@Component({
  // tslint:disable-next-line:component-selector
  selector: 'civica-card',
  templateUrl: './civica-card.component.html',
  styleUrls: ['./civica-card.component.scss'],
  animations: fuseAnimations
})
export class civicaCardComponent implements OnInit, OnDestroy {
  
  helloWorld: String = 'Hello World static';
  helloWorldLabelQuery$: Rx.Observable<any>;
  helloWorldLabelSubscription$: Rx.Observable<any>;

  constructor(private civicaCardervice: civicaCardService  ) {    

  }
    

  ngOnInit() {
    this.helloWorldLabelQuery$ = this.civicaCardervice.getHelloWorld$();
    this.helloWorldLabelSubscription$ = this.civicaCardervice.getEventSourcingMonitorHelloWorldSubscription$();
  }

  
  ngOnDestroy() {
  }

}
