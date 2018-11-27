import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { BluetoothConnectionComponent } from './bluetooth-connection.component';

describe('BluetoothConnectionComponent', () => {
  let component: BluetoothConnectionComponent;
  let fixture: ComponentFixture<BluetoothConnectionComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ BluetoothConnectionComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(BluetoothConnectionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
