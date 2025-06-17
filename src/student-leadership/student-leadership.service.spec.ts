import { Test, TestingModule } from '@nestjs/testing';
import { StudentLeadershipService } from './student-leadership.service';

describe('StudentLeadershipService', () => {
  let service: StudentLeadershipService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [StudentLeadershipService],
    }).compile();

    service = module.get<StudentLeadershipService>(StudentLeadershipService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
