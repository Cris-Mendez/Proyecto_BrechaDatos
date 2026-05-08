import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PriorizacionPage } from './priorizacion-page';

describe('PriorizacionPage', () => {
  let component: PriorizacionPage;
  let fixture: ComponentFixture<PriorizacionPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PriorizacionPage]
    })
      .compileComponents();

    fixture = TestBed.createComponent(PriorizacionPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
