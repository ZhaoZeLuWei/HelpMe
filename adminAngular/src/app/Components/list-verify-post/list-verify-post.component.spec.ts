import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ListVerifyPostComponent } from './list-verify-post.component';

describe('ListVerifyPostComponent', () => {
  let component: ListVerifyPostComponent;
  let fixture: ComponentFixture<ListVerifyPostComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ListVerifyPostComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ListVerifyPostComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
