import { TestBed } from '@angular/core/testing';

import { ServeAPIService } from './serve-api.service';

describe('ServeAPIService', () => {
  let service: ServeAPIService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ServeAPIService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
