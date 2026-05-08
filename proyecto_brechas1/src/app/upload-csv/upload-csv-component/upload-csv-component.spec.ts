import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UploadCsvComponent } from './upload-csv-component';

describe('UploadCsvComponent', () => {
  let component: UploadCsvComponent;
  let fixture: ComponentFixture<UploadCsvComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UploadCsvComponent]
    })
      .compileComponents();

    fixture = TestBed.createComponent(UploadCsvComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
