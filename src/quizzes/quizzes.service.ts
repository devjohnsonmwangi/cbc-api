import { Injectable, Inject, BadRequestException, NotFoundException, ConflictException } from '@nestjs/common';
import { DrizzleDB } from '../drizzle/drizzle.module';
import { DRIZZLE_ORM_TOKEN } from '../drizzle/drizzle.constants';
import { quizTable, quizQuestionTable, questionOptionTable, quizAttemptTable, studentAnswerTable, TQuizSelect, TQuizQuestionSelect, TQuizAttemptSelect } from '../drizzle/schema';
import { eq, and, isNull } from 'drizzle-orm';
import { CreateQuizDto } from './dto/create-quiz.dto';
import { CreateQuestionDto } from './dto/create-question.dto';
import { SubmitAnswersDto } from './dto/submit-answers.dto';
import { LessonContentsService } from '../lesson-contents/lesson-contents.service';
import { StudentsService } from '../students/students.service';

@Injectable()
export class QuizzesService {
  constructor(
    @Inject(DRIZZLE_ORM_TOKEN) private db: DrizzleDB,
    private readonly lessonContentsService: LessonContentsService,
    private readonly studentsService: StudentsService,
  ) {}

  // --- Quiz & Question Management ---

  async createQuiz(createDto: CreateQuizDto): Promise<TQuizSelect> {
    const content = await this.lessonContentsService.findOne(createDto.content_id);
    if (content.content_type !== 'quiz') {
      throw new BadRequestException(`Content with ID ${createDto.content_id} is not of type 'quiz'.`);
    }
    const [newQuiz] = await this.db.insert(quizTable).values(createDto).returning();
    return newQuiz;
  }
  
  async addQuestionToQuiz(createDto: CreateQuestionDto): Promise<TQuizQuestionSelect> {
      const { quiz_id, options, ...questionData } = createDto;
      await this.findOne(quiz_id); // Validate quiz exists

      return this.db.transaction(async (tx) => {
          const [newQuestion] = await tx.insert(quizQuestionTable).values({ quiz_id, ...questionData }).returning();
          if (options && options.length > 0) {
              const optionsToInsert = options.map(opt => ({ question_id: newQuestion.question_id, ...opt }));
              await tx.insert(questionOptionTable).values(optionsToInsert);
          }
          return newQuestion;
      });
  }

  async findOne(id: number): Promise<any> {
    const quiz = await this.db.query.quizTable.findFirst({
        where: eq(quizTable.quiz_id, id),
        with: {
            lessonContent: true,
            questions: { with: { options: true }, orderBy: (q, { asc }) => [asc(q.order)] }
        }
    });
    if (!quiz) throw new NotFoundException(`Quiz with ID ${id} not found.`);
    // For students, we should not return the `is_correct` flag on options.
    // For now, we return everything for the teacher/admin view.
    return quiz;
  }

  // --- Quiz Attempt & Grading Logic ---

  async startQuizAttempt(quizId: number, studentId: number): Promise<TQuizAttemptSelect> {
      await this.findOne(quizId);
      await this.studentsService.findOne(studentId);

      const existingAttempt = await this.db.query.quizAttemptTable.findFirst({
          where: and(eq(quizAttemptTable.quiz_id, quizId), eq(quizAttemptTable.student_id, studentId))
      });
      if (existingAttempt) {
          throw new ConflictException('Student has already attempted this quiz.');
      }
      
      const [newAttempt] = await this.db.insert(quizAttemptTable)
          .values({ quiz_id: quizId, student_id: studentId, start_time: new Date() })
          .returning();
      return newAttempt;
  }

  async submitQuizAnswers(attemptId: number, submission: SubmitAnswersDto): Promise<any> {
      const attempt = await this.db.query.quizAttemptTable.findFirst({
          where: and(eq(quizAttemptTable.attempt_id, attemptId), isNull(quizAttemptTable.end_time))
      });
      if (!attempt) throw new NotFoundException(`Active quiz attempt with ID ${attemptId} not found.`);

      // Get the correct answers for auto-grading
      const quiz = await this.findOne(attempt.quiz_id);
      const correctOptions = new Map<number, number>(); // Map<question_id, correct_option_id>
      quiz.questions.forEach((q: TQuizQuestionSelect & { options: Array<{ option_id: number; is_correct: boolean }> }) => {
          const correct = q.options?.find(o => o.is_correct);
          if (correct) correctOptions.set(q.question_id, correct.option_id);
      });
      
      let score = 0;
      const studentAnswersToInsert = submission.answers.map(ans => {
          if (correctOptions.has(ans.question_id) && correctOptions.get(ans.question_id) === ans.selected_option_id) {
              score++; // Simple scoring: 1 point per correct answer
          }
          return { attempt_id: attemptId, ...ans };
      });
      
      // Calculate final score percentage
      const totalQuestions = quiz.questions.length;
      const finalScore = totalQuestions > 0 ? (score / totalQuestions) * 100 : 0;

      await this.db.transaction(async (tx) => {
          // Save student's answers
          if (studentAnswersToInsert.length > 0) {
            await tx.insert(studentAnswerTable).values(studentAnswersToInsert);
          }
          // Finalize the attempt by setting end time and score
          await tx.update(quizAttemptTable)
            .set({ end_time: new Date(), score: finalScore.toFixed(2) })
            .where(eq(quizAttemptTable.attempt_id, attemptId));
      });
      
      return { message: "Quiz submitted successfully.", score: finalScore.toFixed(2) };
  }

  async getAttemptResult(attemptId: number): Promise<any> {
      const attempt = await this.db.query.quizAttemptTable.findFirst({
          where: eq(quizAttemptTable.attempt_id, attemptId),
          with: {
              student: true,
              quiz: { with: { questions: { with: { options: true } } } },
              answers: true
          }
      });
      if (!attempt) throw new NotFoundException(`Quiz attempt with ID ${attemptId} not found.`);
      return attempt;
  }
}