import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ShowEventComponent } from './show-event.component';

describe('ShowEventComponent', () => {
  let component: ShowEventComponent;
  let fixture: ComponentFixture<ShowEventComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ShowEventComponent] 
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ShowEventComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // (可选) 测试点击事件是否能正常触发
  it('should emit cardClick event on click', () => {
    spyOn(component.cardClick, 'emit');
    component.onCardClick();
    expect(component.cardClick.emit).toHaveBeenCalled();
  });
});