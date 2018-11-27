import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { ReloadCardSuccessfullyComponent } from './reload-card-successfully.component';

describe('ReloadCardSuccessfullyComponent', () => {
  let component: ReloadCardSuccessfullyComponent;
  let fixture: ComponentFixture<ReloadCardSuccessfullyComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ ReloadCardSuccessfullyComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ReloadCardSuccessfullyComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
