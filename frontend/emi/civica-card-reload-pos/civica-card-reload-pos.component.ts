import { CivicaCardReloadPosService } from './civica-card-reload-pos.service';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { fuseAnimations } from '../../../core/animations';
import { Subscription } from 'rxjs/Subscription';
import * as Rx from 'rxjs/Rx';

@Component({
  // tslint:disable-next-line:component-selector
  selector: 'civica-card-reload-pos',
  templateUrl: './civica-card-reload-pos.component.html',
  styleUrls: ['./civica-card-reload-pos.component.scss'],
  animations: fuseAnimations
})
export class CivicaCardReloadPosComponent implements OnInit, OnDestroy {
    

  constructor(private civicaCardReloadPosService: CivicaCardReloadPosService  ) {    

  }    

  ngOnInit() {    
  }

  
  ngOnDestroy() {
  }

}
