import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { AfccIdleComponent } from './afcc-idle.component';

describe('AfccIdleComponent', () => {
  let component: AfccIdleComponent;
  let fixture: ComponentFixture<AfccIdleComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ AfccIdleComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(AfccIdleComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
