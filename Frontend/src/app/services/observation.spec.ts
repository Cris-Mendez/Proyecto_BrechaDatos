import { Observation } from './observation';

describe('Observation', () => {
  let service: Observation;

  beforeEach(() => {
    service = {} as Observation;
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
