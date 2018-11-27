import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { ReadCardErrorComponent } from './read-card-error.component';

describe('ReadCardErrorComponent', () => {
  let component: ReadCardErrorComponent;
  let fixture: ComponentFixture<ReadCardErrorComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ ReadCardErrorComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ReadCardErrorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
