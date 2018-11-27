import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { ReloadCardAbortedComponent } from './reload-card-aborted.component';

describe('ReloadCardAbortedComponent', () => {
  let component: ReloadCardAbortedComponent;
  let fixture: ComponentFixture<ReloadCardAbortedComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ ReloadCardAbortedComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ReloadCardAbortedComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
