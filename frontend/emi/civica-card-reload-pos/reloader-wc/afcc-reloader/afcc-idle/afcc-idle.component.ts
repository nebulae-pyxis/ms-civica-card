import { Component, OnInit } from '@angular/core';
import { AfccRealoderService } from '../../afcc-realoder.service';

@Component({
  selector: 'app-afcc-idle',
  templateUrl: './afcc-idle.component.html',
  styleUrls: ['./afcc-idle.component.scss']
})
export class AfccIdleComponent implements OnInit {
  deviceName;
  constructor(private afccReloaderService: AfccRealoderService) { }

  ngOnInit() {
    this.afccReloaderService.deviceName$.subscribe(name => {
      this.deviceName = name;
    });
  }

}
