import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PriorityTabComponent  } from './priority-tab';

describe('PriorityTab', () => {
  let component: PriorityTabComponent ;
  let fixture: ComponentFixture<PriorityTabComponent >;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PriorityTabComponent ]
    })
      .compileComponents();

    fixture = TestBed.createComponent(PriorityTabComponent );
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
