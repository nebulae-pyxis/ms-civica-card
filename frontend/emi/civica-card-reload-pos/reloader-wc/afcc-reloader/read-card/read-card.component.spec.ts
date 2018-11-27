import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { ReadCardComponent } from './read-card.component';

describe('ReadCardComponent', () => {
  let component: ReadCardComponent;
  let fixture: ComponentFixture<ReadCardComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ ReadCardComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ReadCardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
