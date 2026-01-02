import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { UniversalSearchComponent } from './universal-search.component';

describe('UniversalSearchComponent', () => {
  let component: UniversalSearchComponent;
  let fixture: ComponentFixture<UniversalSearchComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [UniversalSearchComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(UniversalSearchComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
