// src/drizzle/schema.ts

import { relations } from "drizzle-orm";
import { pgTable, pgEnum, serial, varchar, timestamp, integer, decimal, text, index, uniqueIndex, boolean, primaryKey, bigint, jsonb } from "drizzle-orm/pg-core";

// ============================================
//                   Enums
// ============================================

export const genderEnum = pgEnum("gender", ['male', 'female', 'other']);
export const schoolRoleEnum = pgEnum("school_role", ['super_admin', 'school_admin', 'dos', 'teacher', 'student', 'parent', 'accountant', 'librarian', 'kitchen_staff', 'groundsman', 'support_staff', 'board_member']);
export const enrollmentStatusEnum = pgEnum("enrollment_status", ['active', 'graduated', 'withdrawn', 'suspended']);
export const paymentStatusEnum = pgEnum("payment_status", ["pending", "paid", "partially_paid", "failed", "refunded"]);
export const paymentGatewayEnum = pgEnum("payment_gateway", ["mpesa", "bank_transfer", "stripe", "cash"]);
export const assessmentTypeEnum = pgEnum("assessment_type", ['formative', 'summative', 'project', 'portfolio_review']);
export const eventTypeEnum = pgEnum("event_type", ['parent_teacher_meeting', 'sports_day', 'school_trip', 'exam_period', 'holiday', 'general_announcement', 'board_meeting']);
export const documentCategoryEnum = pgEnum("document_category", ['academic', 'portfolio', 'medical', 'legal', 'general', 'consent_form']);
export const notificationTypeEnum = pgEnum("notification_type", ['new_chat_message', 'event_reminder', 'new_assessment_grade', 'fee_due_reminder', 'payment_confirmation', 'new_report_card', 'new_invoice', 'discipline_incident', 'consent_request', 'meeting_minute_published', 'general_announcement', 'new_assignment', 'quiz_due']);
export const auditActionEnum = pgEnum("audit_action", ["CREATE", "UPDATE", "DELETE", "ARCHIVE", "RESTORE", "LOGIN_SUCCESS", "LOGIN_FAIL", "VIEW", "2FA_ENABLED", "2FA_DISABLED"]);
export const groupTypeEnum = pgEnum("group_type", ['club', 'sport_team', 'dormitory', 'house', 'committee']);
export const leadershipScopeEnum = pgEnum("leadership_scope", ['school_wide', 'grade_level', 'class_level', 'group_level']);
export const incidentSeverityEnum = pgEnum("incident_severity", ['low', 'medium', 'high', 'critical']);
export const incidentStatusEnum = pgEnum("incident_status", ['reported', 'under_investigation', 'action_taken', 'resolved', 'closed']);
export const positionTypeEnum = pgEnum("position_type", ['academic_leadership', 'administrative_leadership', 'pastoral_care']);
export const departmentTypeEnum = pgEnum("department_type", ['academic', 'administrative', 'support']);
export const meetingStatusEnum = pgEnum("meeting_status", ['scheduled', 'completed', 'cancelled', 'postponed']);
export const consentStatusEnum = pgEnum("consent_status", ['pending', 'granted', 'denied']);
export const gradeLevelEnum = pgEnum("grade_level", ['pp1', 'pp2', 'grade_1', 'grade_2', 'grade_3', 'grade_4', 'grade_5', 'grade_6', 'grade_7', 'grade_8', 'grade_9', 'grade_10', 'grade_11', 'grade_12']);
export const contentTypeEnum = pgEnum("content_type", ['video', 'pdf', 'text', 'assignment', 'quiz']);
export const questionTypeEnum = pgEnum("question_type", ['multiple_choice', 'true_false', 'short_answer']);
export const subscriptionStatusEnum = pgEnum("subscription_status", ['trialing', 'active', 'past_due', 'canceled', 'unpaid']);
export const planIntervalEnum = pgEnum("plan_interval", ['month', 'year']);
export const platformInvoiceStatusEnum = pgEnum("platform_invoice_status", ['draft', 'open', 'paid', 'uncollectible', 'void']);


// ============================================
//         Platform Subscription & Billing
// ============================================
// This section handles how schools subscribe and pay OUR company for using the platform.

export interface PlanFeatures { canUseLms: boolean; maxStudents: number; supportLevel: 'basic' | 'priority'; canUseAdvancedReports: boolean; }
export const planTable = pgTable("planTable", {
  plan_id: serial("plan_id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull().unique(),
  description: text("description"),
  monthly_price: decimal("monthly_price", { precision: 10, scale: 2 }),
  yearly_price: decimal("yearly_price", { precision: 10, scale: 2 }),
  features: jsonb("features").$type<PlanFeatures>().notNull(),
  is_active: boolean("is_active").default(true).notNull(),
});

export const subscriptionTable = pgTable("subscriptionTable", {
  subscription_id: serial("subscription_id").primaryKey(),
  school_id: integer("school_id").notNull().unique().references(() => schoolTable.school_id, { onDelete: 'cascade' }),
  plan_id: integer("plan_id").notNull().references(() => planTable.plan_id),
  status: subscriptionStatusEnum("status").notNull(),
  current_period_start: timestamp("current_period_start", { withTimezone: true }).notNull(),
  current_period_end: timestamp("current_period_end", { withTimezone: true }).notNull(),
  trial_end_date: timestamp("trial_end_date", { withTimezone: true }),
  canceled_at: timestamp("canceled_at", { withTimezone: true }),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const platformInvoiceTable = pgTable("platformInvoiceTable", {
  invoice_id: serial("invoice_id").primaryKey(),
  subscription_id: integer("subscription_id").notNull().references(() => subscriptionTable.subscription_id, { onDelete: 'cascade' }),
  amount_due: decimal("amount_due", { precision: 12, scale: 2 }).notNull(),
  status: platformInvoiceStatusEnum("status").default('open').notNull(),
  due_date: timestamp("due_date", { mode: 'date' }).notNull(),
  period_start: timestamp("period_start", { withTimezone: true }).notNull(),
  period_end: timestamp("period_end", { withTimezone: true }).notNull(),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const platformPaymentTable = pgTable("platformPaymentTable", {
  payment_id: serial("payment_id").primaryKey(),
  platform_invoice_id: integer("platform_invoice_id").notNull().references(() => platformInvoiceTable.invoice_id, { onDelete: 'cascade' }),
  school_id: integer("school_id").notNull().references(() => schoolTable.school_id),
  payment_amount: decimal("payment_amount", { precision: 10, scale: 2 }).notNull(),
  payment_gateway: paymentGatewayEnum("payment_gateway").notNull(),
  transaction_id: varchar("transaction_id").unique(),
  receipt_url: varchar("receipt_url", { length: 1024 }),
  payment_date: timestamp("payment_date", { withTimezone: true }).defaultNow(),
});


// ============================================
//      School-Specific Third-Party Config
// ============================================
// This section handles the keys each school provides for THEIR payment integrations.

export interface MpesaCredentials { consumerKey: string; consumerSecret: string; passKey: string; shortCode: string; environment: 'sandbox' | 'live'; }
export interface StripeCredentials { secretKey: string; webhookSecret: string; }

export const schoolConfigurationTable = pgTable("schoolConfigurationTable", {
    config_id: serial("config_id").primaryKey(),
    school_id: integer("school_id").notNull().unique().references(() => schoolTable.school_id, { onDelete: "cascade" }),
    mpesa_credentials_encrypted: text("mpesa_credentials_encrypted"),
    stripe_credentials_encrypted: text("stripe_credentials_encrypted"),
    default_payment_gateway: paymentGatewayEnum("default_payment_gateway").default('mpesa'),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updated_at: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});


// ============================================
//         Core Architecture & Org Chart
// ============================================

export interface SchoolSettings { isChatEnabled: boolean; isParentPortalEnabled: boolean; reportCardTemplate: 'template_a' | 'template_b'; requireConsentForTrips: boolean; ipWhitelist: string[] | null; }
export const schoolTable = pgTable("schoolTable", {
  school_id: serial("school_id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  address: text("address"),
  contact_phone: varchar("contact_phone"),
  contact_email: varchar("contact_email"),
  school_logo_url: varchar("school_logo_url"),
  settings: jsonb("settings").$type<SchoolSettings>().default({ isChatEnabled: true, isParentPortalEnabled: true, reportCardTemplate: 'template_a', requireConsentForTrips: true, ipWhitelist: null }),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updated_at: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  archived_at: timestamp("archived_at", { withTimezone: true }),
});

export const userTable = pgTable("userTable", {
  user_id: serial("user_id").primaryKey(),
  full_name: varchar("full_name").notNull(),
  email: varchar("email").notNull().unique(),
  password: varchar("password").notNull(),
  phone_number: varchar("phone_number"),
  profile_picture: varchar("profile_picture"),
  school_id: integer("school_id").references(() => schoolTable.school_id, { onDelete: "cascade" }),
  two_factor_secret: varchar("two_factor_secret"),
  is_two_factor_enabled: boolean("is_two_factor_enabled").default(false).notNull(),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updated_at: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  archived_at: timestamp("archived_at", { withTimezone: true }),
});

export const userRoleLinkTable = pgTable("userRoleLinkTable", {
    user_id: integer("user_id").notNull().references(() => userTable.user_id, { onDelete: 'cascade' }),
    role: schoolRoleEnum("role").notNull(),
}, (table) => ({ pk: primaryKey({ columns: [table.user_id, table.role] }) }));

export const positionTable = pgTable("positionTable", {
    position_id: serial("position_id").primaryKey(),
    school_id: integer("school_id").notNull().references(() => schoolTable.school_id, { onDelete: 'cascade' }),
    user_id: integer("user_id").notNull().references(() => userTable.user_id, { onDelete: 'cascade' }),
    title: varchar("title", { length: 255 }).notNull(),
    position_type: positionTypeEnum("position_type").notNull(),
    start_date: timestamp("start_date", { mode: 'date' }).defaultNow().notNull(),
    end_date: timestamp("end_date", { mode: 'date' }),
    archived_at: timestamp("archived_at", { withTimezone: true }),
});

export const departmentTable = pgTable("departmentTable", {
    department_id: serial("department_id").primaryKey(),
    school_id: integer("school_id").notNull().references(() => schoolTable.school_id, { onDelete: 'cascade' }),
    name: varchar("name", { length: 255 }).notNull(),
    department_type: departmentTypeEnum("department_type").default('academic').notNull(),
    archived_at: timestamp("archived_at", { withTimezone: true }),
});

export const departmentMembershipTable = pgTable("departmentMembershipTable", {
    membership_id: serial("membership_id").primaryKey(),
    department_id: integer("department_id").notNull().references(() => departmentTable.department_id, { onDelete: 'cascade' }),
    user_id: integer("user_id").notNull().references(() => userTable.user_id, { onDelete: 'cascade' }),
    membership_role: varchar("membership_role", { length: 100 }).notNull().default('Member'),
    joined_at: timestamp("joined_at", { withTimezone: true }).defaultNow(),
});

export const functionalAssignmentTable = pgTable("functionalAssignmentTable", {
    assignment_id: serial("assignment_id").primaryKey(),
    manager_user_id: integer("manager_user_id").notNull().references(() => userTable.user_id, { onDelete: 'cascade' }),
    assignee_user_id: integer("assignee_user_id").notNull().references(() => userTable.user_id, { onDelete: 'cascade' }),
    title: varchar("title", { length: 255 }).notNull(),
    description: text("description"),
    start_date: timestamp("start_date", { mode: 'date' }).defaultNow(),
    end_date: timestamp("end_date", { mode: 'date' }),
});

// ============================================
//         Student, Parent & Community
// ============================================

export const studentTable = pgTable("studentTable", {
    student_id: serial("student_id").primaryKey(),
    user_id: integer("user_id").unique().references(() => userTable.user_id, { onDelete: "set null" }),
    admission_number: varchar("admission_number", { length: 50 }).notNull(),
    upi: varchar("upi", { length: 50 }).unique(),
    date_of_birth: timestamp("date_of_birth", { mode: 'date' }),
    gender: genderEnum('gender'),
    school_id: integer("school_id").notNull().references(() => schoolTable.school_id, { onDelete: "cascade" }),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updated_at: timestamp("updated_at", { withTimezone: true }).defaultNow(),
    archived_at: timestamp("archived_at", { withTimezone: true }),
}, (table) => ({ uniqueAdmNoPerSchool: uniqueIndex("school_admission_no_idx").on(table.school_id, table.admission_number) }));

export const parentStudentLinkTable = pgTable("parentStudentLinkTable", {
    parent_user_id: integer("parent_user_id").notNull().references(() => userTable.user_id, { onDelete: 'cascade' }),
    student_id: integer("student_id").notNull().references(() => studentTable.student_id, { onDelete: 'cascade' }),
}, (table) => ({ pk: primaryKey({ columns: [table.parent_user_id, table.student_id] }) }));

export const consentRequestTable = pgTable("consentRequestTable", {
    request_id: serial("request_id").primaryKey(),
    school_id: integer("school_id").notNull().references(() => schoolTable.school_id, { onDelete: 'cascade' }),
    title: varchar("title", { length: 255 }).notNull(),
    description: text("description").notNull(),
    related_event_id: integer("related_event_id").references(() => eventTable.event_id),
    created_by_user_id: integer("created_by_user_id").references(() => userTable.user_id, { onDelete: 'set null' }),
    deadline: timestamp("deadline", { withTimezone: true }),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow(),
    archived_at: timestamp("archived_at", { withTimezone: true }),
});

export const consentResponseTable = pgTable("consentResponseTable", {
    response_id: serial("response_id").primaryKey(),
    request_id: integer("request_id").notNull().references(() => consentRequestTable.request_id, { onDelete: 'cascade' }),
    student_id: integer("student_id").notNull().references(() => studentTable.student_id, { onDelete: 'cascade' }),
    parent_user_id: integer("parent_user_id").notNull().references(() => userTable.user_id, { onDelete: 'cascade' }),
    status: consentStatusEnum("status").default('pending').notNull(),
    comments: text("comments"),
    responded_at: timestamp("responded_at", { withTimezone: true }).defaultNow(),
});


// ============================================
//         Governance & Meetings
// ============================================

export const boardOfManagementTable = pgTable("boardOfManagementTable", {
    bom_id: serial("bom_id").primaryKey(),
    school_id: integer("school_id").notNull().unique().references(() => schoolTable.school_id, { onDelete: 'cascade' }),
    name: varchar("name", { length: 255 }).notNull(),
});

export const boardMemberTable = pgTable("boardMemberTable", {
    member_id: serial("member_id").primaryKey(),
    bom_id: integer("bom_id").notNull().references(() => boardOfManagementTable.bom_id, { onDelete: 'cascade' }),
    user_id: integer("user_id").notNull().references(() => userTable.user_id, { onDelete: 'cascade' }),
    title: varchar("title", { length: 100 }).notNull(),
    term_start_date: timestamp("term_start_date", { mode: 'date' }),
    term_end_date: timestamp("term_end_date", { mode: 'date' }),
});

export const meetingTable = pgTable("meetingTable", {
    meeting_id: serial("meeting_id").primaryKey(),
    school_id: integer("school_id").notNull().references(() => schoolTable.school_id, { onDelete: 'cascade' }),
    title: varchar("title", { length: 255 }).notNull(),
    meeting_datetime: timestamp("meeting_datetime", { withTimezone: true }).notNull(),
    venue_id: integer("venue_id").references(() => venueTable.venue_id),
    status: meetingStatusEnum("status").default('scheduled'),
    created_by_user_id: integer("created_by_user_id").references(() => userTable.user_id, { onDelete: 'set null' }),
    archived_at: timestamp("archived_at", { withTimezone: true }),
});

export const meetingAgendaItemTable = pgTable("meetingAgendaItemTable", {
    item_id: serial("item_id").primaryKey(),
    meeting_id: integer("meeting_id").notNull().references(() => meetingTable.meeting_id, { onDelete: 'cascade' }),
    title: varchar("title", { length: 255 }).notNull(),
    description: text("description"),
    presented_by_user_id: integer("presented_by_user_id").references(() => userTable.user_id, { onDelete: 'set null' }),
    allocated_time_minutes: integer("allocated_time_minutes"),
});

export const meetingMinutesTable = pgTable("meetingMinutesTable", {
    minute_id: serial("minute_id").primaryKey(),
    meeting_id: integer("meeting_id").notNull().references(() => meetingTable.meeting_id, { onDelete: 'cascade' }),
    agenda_item_id: integer("agenda_item_id").references(() => meetingAgendaItemTable.item_id, {onDelete: 'set null'}),
    discussion_summary: text("discussion_summary").notNull(),
    decisions_made: text("decisions_made"),
    recorded_by_user_id: integer("recorded_by_user_id").references(() => userTable.user_id, { onDelete: 'set null' }),
});

export const actionItemTable = pgTable("actionItemTable", {
    action_item_id: serial("action_item_id").primaryKey(),
    meeting_id: integer("meeting_id").notNull().references(() => meetingTable.meeting_id, { onDelete: 'cascade' }),
    description: text("description").notNull(),
    assigned_to_user_id: integer("assigned_to_user_id").references(() => userTable.user_id, { onDelete: 'set null' }),
    due_date: timestamp("due_date", { mode: 'date' }),
    is_completed: boolean("is_completed").default(false),
});

// ============================================
//      Robust E-Learning / LMS Module
// ============================================

export const courseTable = pgTable("courseTable", {
    course_id: serial("course_id").primaryKey(),
    subject_id: integer("subject_id").notNull().references(() => subjectTable.subject_id),
    teacher_id: integer("teacher_id").notNull().references(() => userTable.user_id),
    title: varchar("title").notNull(),
    description: text("description"),
    academic_year_id: integer("academic_year_id").references(() => academicYearTable.year_id),
    archived_at: timestamp("archived_at", { withTimezone: true }),
});

export const courseModuleTable = pgTable("courseModuleTable", {
    module_id: serial("module_id").primaryKey(),
    course_id: integer("course_id").notNull().references(() => courseTable.course_id, {onDelete: 'cascade'}),
    title: varchar("title").notNull(),
    order: integer("order").notNull(),
});

export const lessonContentTable = pgTable("lessonContentTable", {
    content_id: serial("content_id").primaryKey(),
    module_id: integer("module_id").notNull().references(() => courseModuleTable.module_id, {onDelete: 'cascade'}),
    title: varchar("title").notNull(),
    content_type: contentTypeEnum("content_type").notNull(),
    content_url: varchar("content_url"),
    content_text: text("content_text"),
    order: integer("order").notNull(),
});

export const studentContentProgressTable = pgTable("studentContentProgressTable", {
    progress_id: serial("progress_id").primaryKey(),
    student_id: integer("student_id").notNull().references(() => studentTable.student_id, {onDelete: 'cascade'}),
    content_id: integer("content_id").notNull().references(() => lessonContentTable.content_id, {onDelete: 'cascade'}),
    is_completed: boolean("is_completed").default(false).notNull(),
    completed_at: timestamp("completed_at", {withTimezone: true}),
}, (table) => ({ 
    studentContentUnique: uniqueIndex("student_content_unique_idx").on(table.student_id, table.content_id)
}));

export const assignmentTable = pgTable("assignmentTable", {
    assignment_id: serial("assignment_id").primaryKey(),
    content_id: integer("content_id").unique().notNull().references(() => lessonContentTable.content_id, {onDelete: 'cascade'}),
    instructions: text("instructions"),
    due_date: timestamp("due_date", {withTimezone: true}),
    max_points: integer("max_points"),
});

export const studentSubmissionTable = pgTable("studentSubmissionTable", {
    submission_id: serial("submission_id").primaryKey(),
    assignment_id: integer("assignment_id").notNull().references(() => assignmentTable.assignment_id, {onDelete: 'cascade'}),
    student_id: integer("student_id").notNull().references(() => studentTable.student_id, {onDelete: 'cascade'}),
    submission_url: varchar("submission_url"),
    submitted_at: timestamp("submitted_at").defaultNow(),
    grade: decimal("grade", { precision: 5, scale: 2 }),
    feedback: text("feedback"),
});

export const quizTable = pgTable("quizTable", {
    quiz_id: serial("quiz_id").primaryKey(),
    content_id: integer("content_id").unique().notNull().references(() => lessonContentTable.content_id, {onDelete: 'cascade'}),
    time_limit_minutes: integer("time_limit_minutes"),
    archived_at: timestamp("archived_at", { withTimezone: true }),
});

export const quizQuestionTable = pgTable("quizQuestionTable", {
    question_id: serial("question_id").primaryKey(),
    quiz_id: integer("quiz_id").notNull().references(() => quizTable.quiz_id, {onDelete: 'cascade'}),
    question_text: text("question_text").notNull(),
    question_type: questionTypeEnum("question_type").notNull(),
    order: integer("order").notNull(),
});

export const questionOptionTable = pgTable("questionOptionTable", {
    option_id: serial("option_id").primaryKey(),
    question_id: integer("question_id").notNull().references(() => quizQuestionTable.question_id, {onDelete: 'cascade'}),
    option_text: text("option_text").notNull(),
    is_correct: boolean("is_correct").default(false).notNull(),
});

export const quizAttemptTable = pgTable("quizAttemptTable", {
    attempt_id: serial("attempt_id").primaryKey(),
    quiz_id: integer("quiz_id").notNull().references(() => quizTable.quiz_id, {onDelete: 'cascade'}),
    student_id: integer("student_id").notNull().references(() => studentTable.student_id, {onDelete: 'cascade'}),
    start_time: timestamp("start_time", {withTimezone: true}).notNull(),
    end_time: timestamp("end_time", {withTimezone: true}),
    score: decimal("score", { precision: 5, scale: 2 }),
});

export const studentAnswerTable = pgTable("studentAnswerTable", {
    answer_id: serial("answer_id").primaryKey(),
    attempt_id: integer("attempt_id").notNull().references(() => quizAttemptTable.attempt_id, {onDelete: 'cascade'}),
    question_id: integer("question_id").notNull().references(() => quizQuestionTable.question_id, {onDelete: 'cascade'}),
    selected_option_id: integer("selected_option_id").references(() => questionOptionTable.option_id),
    answer_text: text("answer_text"),
});


// ============================================
//         Academic & Operational Core
// ============================================

export const academicYearTable = pgTable("academicYearTable", {
    year_id: serial("year_id").primaryKey(),
    school_id: integer("school_id").notNull().references(() => schoolTable.school_id, { onDelete: "cascade" }),
    year_name: varchar("year_name", { length: 50 }).notNull(),
    start_date: timestamp("start_date", { mode: 'date' }).notNull(),
    end_date: timestamp("end_date", { mode: 'date' }).notNull(),
    archived_at: timestamp("archived_at", { withTimezone: true }),
});

export const termTable = pgTable("termTable", {
    term_id: serial("term_id").primaryKey(),
    academic_year_id: integer("academic_year_id").notNull().references(() => academicYearTable.year_id, { onDelete: "cascade" }),
    term_name: varchar("term_name", { length: 50 }).notNull(),
    start_date: timestamp("start_date", { mode: 'date' }).notNull(),
    end_date: timestamp("end_date", { mode: 'date' }).notNull(),
    archived_at: timestamp("archived_at", { withTimezone: true }),
});

export const classTable = pgTable("classTable", {
    class_id: serial("class_id").primaryKey(),
    school_id: integer("school_id").notNull().references(() => schoolTable.school_id, { onDelete: "cascade" }),
    grade_level: gradeLevelEnum("grade_level").notNull(),
    stream_name: varchar("stream_name", { length: 100 }),
    class_teacher_id: integer("class_teacher_id").references(() => userTable.user_id, { onDelete: "set null" }),
    archived_at: timestamp("archived_at", { withTimezone: true }),
});

export const subjectTable = pgTable("subjectTable", {
    subject_id: serial("subject_id").primaryKey(),
    school_id: integer("school_id").notNull().references(() => schoolTable.school_id, { onDelete: "cascade" }),
    subject_name: varchar("subject_name", { length: 100 }).notNull(),
    subject_code: varchar("subject_code", { length: 20 }),
    archived_at: timestamp("archived_at", { withTimezone: true }),
});

export const studentEnrollmentTable = pgTable("studentEnrollmentTable", {
    enrollment_id: serial("enrollment_id").primaryKey(),
    student_id: integer("student_id").notNull().references(() => studentTable.student_id, { onDelete: "cascade" }),
    class_id: integer("class_id").notNull().references(() => classTable.class_id, { onDelete: "cascade" }),
    academic_year_id: integer("academic_year_id").notNull().references(() => academicYearTable.year_id, { onDelete: "cascade" }),
    status: enrollmentStatusEnum("status").default('active').notNull(),
}, (table) => ({ uniqueEnrollment: uniqueIndex("student_class_year_idx").on(table.student_id, table.academic_year_id) }));

export const teacherSubjectAssignmentTable = pgTable("teacherSubjectAssignmentTable", {
    assignment_id: serial("assignment_id").primaryKey(),
    teacher_id: integer("teacher_id").notNull().references(() => userTable.user_id, { onDelete: "cascade" }),
    subject_id: integer("subject_id").notNull().references(() => subjectTable.subject_id, { onDelete: "cascade" }),
    class_id: integer("class_id").notNull().references(() => classTable.class_id, { onDelete: "cascade" }),
}, (table) => ({ uniqueAssignment: uniqueIndex("teacher_subject_class_idx").on(table.teacher_id, table.subject_id, table.class_id) }));

export const assessmentTable = pgTable("assessmentTable", {
    assessment_id: serial("assessment_id").primaryKey(),
    term_id: integer("term_id").notNull().references(() => termTable.term_id, { onDelete: "cascade" }),
    student_id: integer("student_id").notNull().references(() => studentTable.student_id, { onDelete: "cascade" }),
    subject_id: integer("subject_id").notNull().references(() => subjectTable.subject_id, { onDelete: "cascade" }),
    teacher_id: integer("teacher_id").references(() => userTable.user_id, { onDelete: "set null" }),
    assessment_type: assessmentTypeEnum("assessment_type").notNull(),
    assessment_title: varchar("assessment_title", { length: 255 }),
    strand: varchar("strand", { length: 255 }),
    sub_strand: varchar("sub_strand", { length: 255 }),
    learning_outcome: text("learning_outcome"),
    score: decimal("score", { precision: 5, scale: 2 }),
    performance_level: varchar("performance_level", { length: 50 }),
    teacher_comments: text("teacher_comments"),
    assessment_date: timestamp("assessment_date", { mode: 'date' }).defaultNow().notNull(),
}, (table) => ({ studentSubjectIdx: index("assessment_student_subject_idx").on(table.student_id, table.subject_id) }));

export const disciplineIncidentTable = pgTable("disciplineIncidentTable", {
    incident_id: serial("incident_id").primaryKey(),
    student_id: integer("student_id").notNull().references(() => studentTable.student_id, { onDelete: 'cascade' }),
    reported_by_user_id: integer("reported_by_user_id").references(() => userTable.user_id, { onDelete: 'set null' }),
    incident_datetime: timestamp("incident_datetime", { withTimezone: true }).notNull(),
    location: varchar("location", { length: 255 }),
    description: text("description").notNull(),
    severity: incidentSeverityEnum("severity").default('low'),
    status: incidentStatusEnum("status").default('reported'),
    action_taken: text("action_taken"),
    resolved_at: timestamp("resolved_at", { withTimezone: true }),
    archived_at: timestamp("archived_at", { withTimezone: true }),
});

export const venueTable = pgTable("venueTable", {
    venue_id: serial("venue_id").primaryKey(),
    school_id: integer("school_id").notNull().references(() => schoolTable.school_id, { onDelete: 'cascade' }),
    name: varchar("name", { length: 100 }).notNull(),
    capacity: integer("capacity"),
    archived_at: timestamp("archived_at", { withTimezone: true }),
});

export const timetableSlotTable = pgTable("timetableSlotTable", {
    slot_id: serial("slot_id").primaryKey(),
    school_id: integer("school_id").notNull().references(() => schoolTable.school_id, { onDelete: 'cascade' }),
    day_of_week: integer("day_of_week").notNull(),
    start_time: varchar("start_time", { length: 5 }).notNull(),
    end_time: varchar("end_time", { length: 5 }).notNull(),
});

export const lessonTable = pgTable("lessonTable", {
    lesson_id: serial("lesson_id").primaryKey(),
    term_id: integer("term_id").notNull().references(() => termTable.term_id, { onDelete: 'cascade' }),
    slot_id: integer("slot_id").notNull().references(() => timetableSlotTable.slot_id, { onDelete: 'cascade' }),
    class_id: integer("class_id").notNull().references(() => classTable.class_id, { onDelete: 'cascade' }),
    subject_id: integer("subject_id").notNull().references(() => subjectTable.subject_id, { onDelete: 'cascade' }),
    teacher_id: integer("teacher_id").notNull().references(() => userTable.user_id, { onDelete: 'cascade' }),
    venue_id: integer("venue_id").references(() => venueTable.venue_id, { onDelete: 'set null' }),
});

export const groupTable = pgTable("groupTable", {
    group_id: serial("group_id").primaryKey(),
    school_id: integer("school_id").notNull().references(() => schoolTable.school_id, { onDelete: 'cascade' }),
    name: varchar("name", { length: 255 }).notNull(),
    description: text("description"),
    group_type: groupTypeEnum("group_type").notNull(),
    faculty_advisor_id: integer("faculty_advisor_id").references(() => userTable.user_id, { onDelete: 'set null' }),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow(),
    archived_at: timestamp("archived_at", { withTimezone: true }),
});

export const groupMembershipTable = pgTable("groupMembershipTable", {
    membership_id: serial("membership_id").primaryKey(),
    group_id: integer("group_id").notNull().references(() => groupTable.group_id, { onDelete: 'cascade' }),
    user_id: integer("user_id").notNull().references(() => userTable.user_id, { onDelete: 'cascade' }),
    membership_role: varchar("membership_role", { length: 100 }),
    joined_at: timestamp("joined_at", { withTimezone: true }).defaultNow(),
});

export const leadershipPositionTable = pgTable("leadershipPositionTable", {
    position_id: serial("position_id").primaryKey(),
    title: varchar("title", { length: 255 }).notNull(),
    student_id: integer("student_id").notNull().references(() => studentTable.student_id, { onDelete: 'cascade' }),
    academic_year_id: integer("academic_year_id").notNull().references(() => academicYearTable.year_id, { onDelete: 'cascade' }),
    scope: leadershipScopeEnum("scope").notNull(),
    start_date: timestamp("start_date", { mode: 'date' }),
    end_date: timestamp("end_date", { mode: 'date' }),
});

// ============================================
//         Finance & Communication (School Level)
// ============================================

export const feeStructureTable = pgTable("feeStructureTable", {
    fee_structure_id: serial("fee_structure_id").primaryKey(),
    academic_year_id: integer("academic_year_id").notNull().references(() => academicYearTable.year_id, { onDelete: "cascade" }),
    grade_level: gradeLevelEnum("grade_level").notNull(),
    description: varchar("description", { length: 255 }).notNull(),
    total_amount: decimal("total_amount", { precision: 12, scale: 2 }).notNull(),
    archived_at: timestamp("archived_at", { withTimezone: true }),
});

export const invoiceTable = pgTable("invoiceTable", {
    invoice_id: serial("invoice_id").primaryKey(),
    student_id: integer("student_id").notNull().references(() => studentTable.student_id, { onDelete: "cascade" }),
    term_id: integer("term_id").notNull().references(() => termTable.term_id, { onDelete: "cascade" }),
    amount_due: decimal("amount_due", { precision: 12, scale: 2 }).notNull(),
    amount_paid: decimal("amount_paid", { precision: 12, scale: 2 }).default("0.00").notNull(),
    due_date: timestamp("due_date", { mode: 'date' }).notNull(),
    status: paymentStatusEnum("status").default('pending').notNull(),
    notes: text("notes"),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const paymentTable = pgTable("paymentTable", {
  payment_id: serial("payment_id").primaryKey(),
  invoice_id: integer("invoice_id").notNull().references(() => invoiceTable.invoice_id, { onDelete: "cascade" }),
  paid_by_user_id: integer("paid_by_user_id").notNull().references(() => userTable.user_id, { onDelete: "cascade" }),
  payment_amount: decimal("payment_amount", { precision: 10, scale: 2 }).notNull(),
  payment_status: paymentStatusEnum("payment_status").default("pending"),
  payment_gateway: paymentGatewayEnum("payment_gateway").notNull(),
  transaction_id: varchar("transaction_id").unique(),
  checkout_request_id: varchar("checkout_request_id"),
  receipt_url: varchar("receipt_url", { length: 1024 }),
  payment_date: timestamp("payment_date", { withTimezone: true }).defaultNow(),
});

export const chatConversationTable = pgTable("chatConversationTable", {
  conversation_id: serial("conversation_id").primaryKey(),
  school_id: integer("school_id").references(() => schoolTable.school_id, { onDelete: "cascade" }),
  title: varchar("title", { length: 255 }),
  is_group_chat: boolean("is_group_chat").default(false).notNull(),
  creator_id: integer("creator_id").references(() => userTable.user_id, { onDelete: "set null" }),
  created_at: bigint("created_at", { mode: 'number' }).notNull(),
  updated_at: bigint("updated_at", { mode: 'number' }).notNull(),
});

export const chatParticipantTable = pgTable("chatParticipantTable", {
  user_id: integer("user_id").notNull().references(() => userTable.user_id, { onDelete: "cascade" }),
  conversation_id: integer("conversation_id").notNull().references(() => chatConversationTable.conversation_id, { onDelete: "cascade" }),
  joined_at: bigint("joined_at", { mode: 'number' }).notNull(),
  last_read_at: bigint("last_read_at", { mode: 'number' }),
}, (table) => ({ pk: primaryKey({ columns: [table.user_id, table.conversation_id] }) }));

export const chatMessageTable = pgTable("chatMessageTable", {
  message_id: serial("message_id").primaryKey(),
  conversation_id: integer("conversation_id").notNull().references(() => chatConversationTable.conversation_id, { onDelete: "cascade" }),
  sender_id: integer("sender_id").notNull().references(() => userTable.user_id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  sent_at: bigint("sent_at", { mode: 'number' }).notNull(),
});

export const notificationTable = pgTable("notificationTable", {
  notification_id: serial("notification_id").primaryKey(),
  recipient_user_id: integer("recipient_user_id").notNull().references(() => userTable.user_id, { onDelete: "cascade" }),
  type: notificationTypeEnum("type").notNull(),
  title: varchar("title", { length: 255 }),
  message: text("message").notNull(),
  link_url: varchar("link_url"),
  is_read: boolean("is_read").default(false).notNull(),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const eventTable = pgTable("eventTable", {
  event_id: serial("event_id").primaryKey(),
  school_id: integer("school_id").notNull().references(() => schoolTable.school_id, { onDelete: "cascade" }),
  event_type: eventTypeEnum("event_type").notNull(),
  title: varchar("title").notNull(),
  description: text("description"),
  start_time: timestamp("start_time", { withTimezone: true }).notNull(),
  end_time: timestamp("end_time", { withTimezone: true }),
  created_by_user_id: integer("created_by_user_id").references(() => userTable.user_id, { onDelete: "set null" }),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow(),
  archived_at: timestamp("archived_at", { withTimezone: true }),
});

export const documentTable = pgTable("documentTable", {
  document_id: serial("document_id").primaryKey(),
  school_id: integer("school_id").notNull().references(() => schoolTable.school_id, { onDelete: "cascade" }),
  student_id: integer("student_id").references(() => studentTable.student_id, { onDelete: "cascade" }),
  uploaded_by_user_id: integer("uploaded_by_user_id").references(() => userTable.user_id, { onDelete: "set null" }),
  document_name: varchar("document_name").notNull(),
  document_url: varchar("document_url").notNull(),
  category: documentCategoryEnum("category").default('general'),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const supportTicketTable = pgTable("supportTicketTable", {
  ticket_id: serial("ticket_id").primaryKey(),
  requester_user_id: integer("requester_user_id").notNull().references(() => userTable.user_id, { onDelete: "cascade" }),
  school_id: integer("school_id").references(() => schoolTable.school_id, { onDelete: "cascade" }),
  subject: varchar("subject", { length: 255 }).notNull(),
  description: text("description").notNull(),
  status: varchar("status", { length: 255 }).default("Open").notNull(),
  assignee_id: integer("assignee_id").references(() => userTable.user_id, { onDelete: "set null"}),
  priority: varchar("priority", {length: 50}).default('medium'),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updated_at: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

// ============================================
//         Advanced Security Features
// ============================================

export const userSessionTable = pgTable("userSessionTable", {
    session_id: serial("session_id").primaryKey(),
    user_id: integer("user_id").notNull().references(() => userTable.user_id, {onDelete: 'cascade'}),
    token: varchar("token").notNull().unique(),
    ip_address: varchar("ip_address"),
    user_agent: text("user_agent"),
    created_at: timestamp("created_at", {withTimezone: true}).defaultNow(),
    expires_at: timestamp("expires_at", {withTimezone: true}).notNull(),
});

export const apiKeyTable = pgTable("apiKeyTable", {
    key_id: serial("key_id").primaryKey(),
    user_id: integer("user_id").notNull().references(() => userTable.user_id, {onDelete: 'cascade'}),
    key_hash: varchar("key_hash").notNull().unique(),
    key_prefix: varchar("key_prefix", {length: 8}).notNull().unique(),
    label: varchar("label").notNull(),
    last_used_at: timestamp("last_used_at"),
    created_at: timestamp("created_at").defaultNow(),
    expires_at: timestamp("expires_at"),
    archived_at: timestamp("archived_at", { withTimezone: true }),
});

export const passwordHistoryTable = pgTable("passwordHistoryTable", {
    history_id: serial("history_id").primaryKey(),
    user_id: integer("user_id").notNull().references(() => userTable.user_id, {onDelete: 'cascade'}),
    password_hash: varchar("password_hash").notNull(),
    created_at: timestamp("created_at", {withTimezone: true}).defaultNow(),
});

export const permissionTable = pgTable("permissionTable", {
    id: serial("id").primaryKey(),
    name: varchar("name", { length: 100 }).notNull().unique(),
    description: text("description"),
});

export const rolePermissionTable = pgTable("rolePermissionTable", {
    role: schoolRoleEnum("role").notNull(),
    permission_id: integer("permission_id").notNull().references(() => permissionTable.id, { onDelete: 'cascade' }),
}, (table) => ({ pk: primaryKey({ columns: [table.role, table.permission_id] }) }));

export const auditLogTable = pgTable("auditLogTable", {
    id: serial("id").primaryKey(),
    user_id: integer("user_id").references(() => userTable.user_id, { onDelete: 'set null' }),
    school_id: integer("school_id").references(() => schoolTable.school_id, { onDelete: 'cascade' }),
    action: auditActionEnum("action").notNull(),
    table_name: varchar("table_name", { length: 100 }),
    record_pk: integer("record_pk"),
    old_data: jsonb("old_data"),
    new_data: jsonb("new_data"),
    ip_address: varchar("ip_address", { length: 50 }),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const passwordResetTokenTable = pgTable("passwordResetTokenTable", {
  id: serial("id").primaryKey(),
  token: varchar("token", { length: 255 }).notNull().unique(),
  user_id: integer("user_id").notNull().references(() => userTable.user_id, { onDelete: "cascade" }),
  expires_at: timestamp("expires_at", { withTimezone: true }).notNull(),
});

// =================================================================================
//                        COMPLETE RELATIONSHIPS DEFINITION
// =================================================================================

// --- Platform Billing ---
export const planRelations = relations(planTable, ({ many }) => ({
  subscriptions: many(subscriptionTable),
}));
export const subscriptionRelations = relations(subscriptionTable, ({ one, many }) => ({
  school: one(schoolTable, { fields: [subscriptionTable.school_id], references: [schoolTable.school_id] }),
  plan: one(planTable, { fields: [subscriptionTable.plan_id], references: [planTable.plan_id] }),
  invoices: many(platformInvoiceTable),
}));
export const platformInvoiceRelations = relations(platformInvoiceTable, ({ one, many }) => ({
  subscription: one(subscriptionTable, { fields: [platformInvoiceTable.subscription_id], references: [subscriptionTable.subscription_id] }),
  payments: many(platformPaymentTable),
}));
export const platformPaymentRelations = relations(platformPaymentTable, ({ one }) => ({
  invoice: one(platformInvoiceTable, { fields: [platformPaymentTable.platform_invoice_id], references: [platformInvoiceTable.invoice_id] }),
  school: one(schoolTable, { fields: [platformPaymentTable.school_id], references: [schoolTable.school_id] }),
}));
export const schoolConfigurationRelations = relations(schoolConfigurationTable, ({ one }) => ({
    school: one(schoolTable, { fields: [schoolConfigurationTable.school_id], references: [schoolTable.school_id] }),
}));

// --- Core & Org Chart ---
export const schoolRelations = relations(schoolTable, ({ one, many }) => ({
    users: many(userTable),
    students: many(studentTable),
    academicYears: many(academicYearTable),
    classes: many(classTable),
    subjects: many(subjectTable),
    documents: many(documentTable),
    events: many(eventTable),
    supportTickets: many(supportTicketTable),
    chatConversations: many(chatConversationTable),
    auditLogs: many(auditLogTable),
    positions: many(positionTable),
    departments: many(departmentTable),
    boardOfManagement: one(boardOfManagementTable),
    consentRequests: many(consentRequestTable),
    meetings: many(meetingTable),
    configuration: one(schoolConfigurationTable, { fields: [schoolTable.school_id], references: [schoolConfigurationTable.school_id] }),
    subscription: one(subscriptionTable, { fields: [schoolTable.school_id], references: [subscriptionTable.school_id] }),
}));
export const userRelations = relations(userTable, ({ one, many }) => ({
    school: one(schoolTable, { fields: [userTable.school_id], references: [schoolTable.school_id] }),
    roles: many(userRoleLinkTable),
    studentProfile: one(studentTable, { fields: [userTable.user_id], references: [studentTable.user_id] }),
    parentLinks: many(parentStudentLinkTable, { relationName: "parentUser" }),
    teacherSubjectAssignments: many(teacherSubjectAssignmentTable),
    assessmentsGiven: many(assessmentTable),
    paymentsMade: many(paymentTable),
    documentsUploaded: many(documentTable),
    eventsCreated: many(eventTable, { relationName: 'eventsCreated' }),
    ticketsCreated: many(supportTicketTable, { relationName: 'requesterTickets' }),
    ticketsAssigned: many(supportTicketTable, { relationName: 'assignedTickets' }),
    notifications: many(notificationTable),
    passwordResetTokens: many(passwordResetTokenTable),
    chatParticipants: many(chatParticipantTable),
    chatMessagesSent: many(chatMessageTable),
    chatConversationsCreated: many(chatConversationTable),
    auditLogs: many(auditLogTable),
    heldPositions: many(positionTable),
    departmentMemberships: many(departmentMembershipTable),
    functionalAssignments: many(functionalAssignmentTable, { relationName: 'userAsAssignee' }),
    functionalReports: many(functionalAssignmentTable, { relationName: 'userAsManager' }),
    boardMembership: one(boardMemberTable),
    consentRequestsCreated: many(consentRequestTable, { relationName: 'consentCreator' }),
    consentResponsesGiven: many(consentResponseTable),
    meetingsCreated: many(meetingTable, { relationName: 'meetingCreator' }),
    agendaItemsPresented: many(meetingAgendaItemTable),
    minutesRecorded: many(meetingMinutesTable),
    actionItemsAssigned: many(actionItemTable),
    coursesTaught: many(courseTable),
    sessions: many(userSessionTable),
    apiKeys: many(apiKeyTable),
    passwordHistory: many(passwordHistoryTable),
}));
export const userRoleLinkRelations = relations(userRoleLinkTable, ({ one }) => ({
    user: one(userTable, { fields: [userRoleLinkTable.user_id], references: [userTable.user_id] }),
}));
export const positionRelations = relations(positionTable, ({ one }) => ({
    school: one(schoolTable, { fields: [positionTable.school_id], references: [schoolTable.school_id] }),
    user: one(userTable, { fields: [positionTable.user_id], references: [userTable.user_id] }),
}));
export const departmentRelations = relations(departmentTable, ({ one, many }) => ({
    school: one(schoolTable, { fields: [departmentTable.school_id], references: [schoolTable.school_id] }),
    memberships: many(departmentMembershipTable),
}));
export const departmentMembershipRelations = relations(departmentMembershipTable, ({ one }) => ({
    department: one(departmentTable, { fields: [departmentMembershipTable.department_id], references: [departmentTable.department_id] }),
    user: one(userTable, { fields: [departmentMembershipTable.user_id], references: [userTable.user_id] }),
}));
export const functionalAssignmentRelations = relations(functionalAssignmentTable, ({ one }) => ({
    manager: one(userTable, { fields: [functionalAssignmentTable.manager_user_id], references: [userTable.user_id], relationName: 'userAsManager' }),
    assignee: one(userTable, { fields: [functionalAssignmentTable.assignee_user_id], references: [userTable.user_id], relationName: 'userAsAssignee' }),
}));

// --- Student & Parent Community ---
export const studentRelations = relations(studentTable, ({ one, many }) => ({
    userAccount: one(userTable, { fields: [studentTable.user_id], references: [userTable.user_id] }),
    school: one(schoolTable, { fields: [studentTable.school_id], references: [schoolTable.school_id] }),
    parentLinks: many(parentStudentLinkTable, { relationName: "student" }),
    enrollments: many(studentEnrollmentTable),
    assessments: many(assessmentTable),
    invoices: many(invoiceTable),
    documents: many(documentTable),
    leadershipPositions: many(leadershipPositionTable),
    disciplineIncidents: many(disciplineIncidentTable),
    consentResponses: many(consentResponseTable),
    submissions: many(studentSubmissionTable),
    contentProgress: many(studentContentProgressTable),
    quizAttempts: many(quizAttemptTable),
}));
export const parentStudentLinkRelations = relations(parentStudentLinkTable, ({ one }) => ({
    parent: one(userTable, { fields: [parentStudentLinkTable.parent_user_id], references: [userTable.user_id], relationName: "parentUser" }),
    student: one(studentTable, { fields: [parentStudentLinkTable.student_id], references: [studentTable.student_id], relationName: "student" }),
}));
export const consentRequestRelations = relations(consentRequestTable, ({ one, many }) => ({
    school: one(schoolTable, { fields: [consentRequestTable.school_id], references: [schoolTable.school_id] }),
    creator: one(userTable, { fields: [consentRequestTable.created_by_user_id], references: [userTable.user_id], relationName: 'consentCreator' }),
    event: one(eventTable, { fields: [consentRequestTable.related_event_id], references: [eventTable.event_id] }),
    responses: many(consentResponseTable),
}));
export const consentResponseRelations = relations(consentResponseTable, ({ one }) => ({
    request: one(consentRequestTable, { fields: [consentResponseTable.request_id], references: [consentRequestTable.request_id] }),
    student: one(studentTable, { fields: [consentResponseTable.student_id], references: [studentTable.student_id] }),
    parent: one(userTable, { fields: [consentResponseTable.parent_user_id], references: [userTable.user_id] }),
}));

// --- Governance ---
export const boardOfManagementRelations = relations(boardOfManagementTable, ({ one, many }) => ({
    school: one(schoolTable, { fields: [boardOfManagementTable.school_id], references: [schoolTable.school_id] }),
    members: many(boardMemberTable),
}));
export const boardMemberRelations = relations(boardMemberTable, ({ one }) => ({
    bom: one(boardOfManagementTable, { fields: [boardMemberTable.bom_id], references: [boardOfManagementTable.bom_id] }),
    user: one(userTable, { fields: [boardMemberTable.user_id], references: [userTable.user_id] }),
}));
export const meetingRelations = relations(meetingTable, ({ one, many }) => ({
    school: one(schoolTable, { fields: [meetingTable.school_id], references: [schoolTable.school_id] }),
    venue: one(venueTable, { fields: [meetingTable.venue_id], references: [venueTable.venue_id] }),
    creator: one(userTable, { fields: [meetingTable.created_by_user_id], references: [userTable.user_id], relationName: 'meetingCreator' }),
    agendaItems: many(meetingAgendaItemTable),
    minutes: many(meetingMinutesTable),
    actionItems: many(actionItemTable),
}));
export const meetingAgendaItemRelations = relations(meetingAgendaItemTable, ({ one, many }) => ({
    meeting: one(meetingTable, { fields: [meetingAgendaItemTable.meeting_id], references: [meetingTable.meeting_id] }),
    presenter: one(userTable, { fields: [meetingAgendaItemTable.presented_by_user_id], references: [userTable.user_id] }),
    minutes: many(meetingMinutesTable),
}));
export const meetingMinutesRelations = relations(meetingMinutesTable, ({ one }) => ({
    meeting: one(meetingTable, { fields: [meetingMinutesTable.meeting_id], references: [meetingTable.meeting_id] }),
    agendaItem: one(meetingAgendaItemTable, { fields: [meetingMinutesTable.agenda_item_id], references: [meetingAgendaItemTable.item_id] }),
    recorder: one(userTable, { fields: [meetingMinutesTable.recorded_by_user_id], references: [userTable.user_id] }),
}));
export const actionItemRelations = relations(actionItemTable, ({ one }) => ({
    meeting: one(meetingTable, { fields: [actionItemTable.meeting_id], references: [meetingTable.meeting_id] }),
    assignee: one(userTable, { fields: [actionItemTable.assigned_to_user_id], references: [userTable.user_id] }),
}));

// --- Academics & LMS ---
export const academicYearRelations = relations(academicYearTable, ({ one, many }) => ({
    school: one(schoolTable, { fields: [academicYearTable.school_id], references: [schoolTable.school_id] }),
    terms: many(termTable),
    feeStructures: many(feeStructureTable),
    enrollments: many(studentEnrollmentTable),
    studentLeadership: many(leadershipPositionTable),
    courses: many(courseTable),
}));
export const termRelations = relations(termTable, ({ one, many }) => ({
    academicYear: one(academicYearTable, { fields: [termTable.academic_year_id], references: [academicYearTable.year_id] }),
    assessments: many(assessmentTable),
    invoices: many(invoiceTable),
    lessons: many(lessonTable),
}));
export const classRelations = relations(classTable, ({ one, many }) => ({
    school: one(schoolTable, { fields: [classTable.school_id], references: [schoolTable.school_id] }),
    classTeacher: one(userTable, { fields: [classTable.class_teacher_id], references: [userTable.user_id] }),
    enrollments: many(studentEnrollmentTable),
    teacherAssignments: many(teacherSubjectAssignmentTable),
    lessons: many(lessonTable),
}));
export const subjectRelations = relations(subjectTable, ({ one, many }) => ({
    school: one(schoolTable, { fields: [subjectTable.school_id], references: [schoolTable.school_id] }),
    teacherAssignments: many(teacherSubjectAssignmentTable),
    assessments: many(assessmentTable),
    lessons: many(lessonTable),
    courses: many(courseTable),
}));
export const studentEnrollmentRelations = relations(studentEnrollmentTable, ({ one }) => ({
    student: one(studentTable, { fields: [studentEnrollmentTable.student_id], references: [studentTable.student_id] }),
    class: one(classTable, { fields: [studentEnrollmentTable.class_id], references: [classTable.class_id] }),
    academicYear: one(academicYearTable, { fields: [studentEnrollmentTable.academic_year_id], references: [academicYearTable.year_id] }),
}));
export const teacherSubjectAssignmentRelations = relations(teacherSubjectAssignmentTable, ({ one }) => ({
    teacher: one(userTable, { fields: [teacherSubjectAssignmentTable.teacher_id], references: [userTable.user_id] }),
    subject: one(subjectTable, { fields: [teacherSubjectAssignmentTable.subject_id], references: [subjectTable.subject_id] }),
    class: one(classTable, { fields: [teacherSubjectAssignmentTable.class_id], references: [classTable.class_id] }),
}));
export const assessmentRelations = relations(assessmentTable, ({ one }) => ({
    term: one(termTable, { fields: [assessmentTable.term_id], references: [termTable.term_id] }),
    student: one(studentTable, { fields: [assessmentTable.student_id], references: [studentTable.student_id] }),
    subject: one(subjectTable, { fields: [assessmentTable.subject_id], references: [subjectTable.subject_id] }),
    teacher: one(userTable, { fields: [assessmentTable.teacher_id], references: [userTable.user_id] }),
}));
export const courseRelations = relations(courseTable, ({ one, many }) => ({
    subject: one(subjectTable, { fields: [courseTable.subject_id], references: [subjectTable.subject_id] }),
    teacher: one(userTable, { fields: [courseTable.teacher_id], references: [userTable.user_id] }),
    academicYear: one(academicYearTable, { fields: [courseTable.academic_year_id], references: [academicYearTable.year_id] }),
    modules: many(courseModuleTable),
}));
export const courseModuleRelations = relations(courseModuleTable, ({ one, many }) => ({
    course: one(courseTable, { fields: [courseModuleTable.course_id], references: [courseTable.course_id] }),
    contents: many(lessonContentTable),
}));
export const lessonContentRelations = relations(lessonContentTable, ({ one, many }) => ({
    module: one(courseModuleTable, { fields: [lessonContentTable.module_id], references: [courseModuleTable.module_id] }),
    assignment: one(assignmentTable, { fields: [lessonContentTable.content_id], references: [assignmentTable.content_id] }),
    quiz: one(quizTable, { fields: [lessonContentTable.content_id], references: [quizTable.content_id] }),
    progress: many(studentContentProgressTable),
}));
export const studentContentProgressRelations = relations(studentContentProgressTable, ({ one }) => ({
    student: one(studentTable, { fields: [studentContentProgressTable.student_id], references: [studentTable.student_id] }),
    content: one(lessonContentTable, { fields: [studentContentProgressTable.content_id], references: [lessonContentTable.content_id] }),
}));
export const assignmentRelations = relations(assignmentTable, ({ one, many }) => ({
    lessonContent: one(lessonContentTable, { fields: [assignmentTable.content_id], references: [lessonContentTable.content_id] }),
    submissions: many(studentSubmissionTable),
}));
export const studentSubmissionRelations = relations(studentSubmissionTable, ({ one }) => ({
    assignment: one(assignmentTable, { fields: [studentSubmissionTable.assignment_id], references: [assignmentTable.assignment_id] }),
    student: one(studentTable, { fields: [studentSubmissionTable.student_id], references: [studentTable.student_id] }),
}));
export const quizRelations = relations(quizTable, ({ one, many }) => ({
    lessonContent: one(lessonContentTable, { fields: [quizTable.content_id], references: [lessonContentTable.content_id] }),
    questions: many(quizQuestionTable),
    attempts: many(quizAttemptTable),
}));
export const quizQuestionRelations = relations(quizQuestionTable, ({ one, many }) => ({
    quiz: one(quizTable, { fields: [quizQuestionTable.quiz_id], references: [quizTable.quiz_id] }),
    options: many(questionOptionTable),
    studentAnswers: many(studentAnswerTable),
}));
export const questionOptionRelations = relations(questionOptionTable, ({ one, many }) => ({
    question: one(quizQuestionTable, { fields: [questionOptionTable.question_id], references: [quizQuestionTable.question_id] }),
    studentAnswers: many(studentAnswerTable),
}));
export const quizAttemptRelations = relations(quizAttemptTable, ({ one, many }) => ({
    quiz: one(quizTable, { fields: [quizAttemptTable.quiz_id], references: [quizTable.quiz_id] }),
    student: one(studentTable, { fields: [quizAttemptTable.student_id], references: [studentTable.student_id] }),
    answers: many(studentAnswerTable),
}));
export const studentAnswerRelations = relations(studentAnswerTable, ({ one }) => ({
    attempt: one(quizAttemptTable, { fields: [studentAnswerTable.attempt_id], references: [quizAttemptTable.attempt_id] }),
    question: one(quizQuestionTable, { fields: [studentAnswerTable.question_id], references: [quizQuestionTable.question_id] }),
    selectedOption: one(questionOptionTable, { fields: [studentAnswerTable.selected_option_id], references: [questionOptionTable.option_id] }),
}));

// --- Operations ---
export const disciplineIncidentRelations = relations(disciplineIncidentTable, ({ one }) => ({
    student: one(studentTable, { fields: [disciplineIncidentTable.student_id], references: [studentTable.student_id] }),
    reporter: one(userTable, { fields: [disciplineIncidentTable.reported_by_user_id], references: [userTable.user_id] }),
}));
export const venueRelations = relations(venueTable, ({ one, many }) => ({
    school: one(schoolTable, { fields: [venueTable.school_id], references: [schoolTable.school_id] }),
    lessons: many(lessonTable),
    meetings: many(meetingTable),
}));
export const timetableSlotRelations = relations(timetableSlotTable, ({ one, many }) => ({
    school: one(schoolTable, { fields: [timetableSlotTable.school_id], references: [schoolTable.school_id] }),
    lessons: many(lessonTable),
}));
export const lessonRelations = relations(lessonTable, ({ one }) => ({
    term: one(termTable, { fields: [lessonTable.term_id], references: [termTable.term_id] }),
    slot: one(timetableSlotTable, { fields: [lessonTable.slot_id], references: [timetableSlotTable.slot_id] }),
    class: one(classTable, { fields: [lessonTable.class_id], references: [classTable.class_id] }),
    subject: one(subjectTable, { fields: [lessonTable.subject_id], references: [subjectTable.subject_id] }),
    teacher: one(userTable, { fields: [lessonTable.teacher_id], references: [userTable.user_id] }),
    venue: one(venueTable, { fields: [lessonTable.venue_id], references: [venueTable.venue_id] }),
}));
export const groupRelations = relations(groupTable, ({ one, many }) => ({
    school: one(schoolTable, { fields: [groupTable.school_id], references: [schoolTable.school_id] }),
    advisor: one(userTable, { fields: [groupTable.faculty_advisor_id], references: [userTable.user_id] }),
    memberships: many(groupMembershipTable),
}));
export const groupMembershipRelations = relations(groupMembershipTable, ({ one }) => ({
    group: one(groupTable, { fields: [groupMembershipTable.group_id], references: [groupTable.group_id] }),
    user: one(userTable, { fields: [groupMembershipTable.user_id], references: [userTable.user_id] }),
}));
export const leadershipPositionRelations = relations(leadershipPositionTable, ({ one }) => ({
    student: one(studentTable, { fields: [leadershipPositionTable.student_id], references: [studentTable.student_id] }),
    academicYear: one(academicYearTable, { fields: [leadershipPositionTable.academic_year_id], references: [academicYearTable.year_id] }),
}));

// --- Finance ---
export const feeStructureRelations = relations(feeStructureTable, ({ one }) => ({
    academicYear: one(academicYearTable, { fields: [feeStructureTable.academic_year_id], references: [academicYearTable.year_id] }),
}));
export const invoiceRelations = relations(invoiceTable, ({ one, many }) => ({
    student: one(studentTable, { fields: [invoiceTable.student_id], references: [studentTable.student_id] }),
    term: one(termTable, { fields: [invoiceTable.term_id], references: [termTable.term_id] }),
    payments: many(paymentTable),
}));
export const paymentRelations = relations(paymentTable, ({ one }) => ({
    invoice: one(invoiceTable, { fields: [paymentTable.invoice_id], references: [invoiceTable.invoice_id] }),
    payer: one(userTable, { fields: [paymentTable.paid_by_user_id], references: [userTable.user_id] }),
}));

// --- Communication ---
export const chatConversationRelations = relations(chatConversationTable, ({ one, many }) => ({
    school: one(schoolTable, { fields: [chatConversationTable.school_id], references: [schoolTable.school_id] }),
    creator: one(userTable, { fields: [chatConversationTable.creator_id], references: [userTable.user_id] }),
    participants: many(chatParticipantTable),
    messages: many(chatMessageTable),
}));
export const chatParticipantRelations = relations(chatParticipantTable, ({ one }) => ({
    user: one(userTable, { fields: [chatParticipantTable.user_id], references: [userTable.user_id] }),
    conversation: one(chatConversationTable, { fields: [chatParticipantTable.conversation_id], references: [chatConversationTable.conversation_id] }),
}));
export const chatMessageRelations = relations(chatMessageTable, ({ one }) => ({
    conversation: one(chatConversationTable, { fields: [chatMessageTable.conversation_id], references: [chatConversationTable.conversation_id] }),
    sender: one(userTable, { fields: [chatMessageTable.sender_id], references: [userTable.user_id] }),
}));
export const notificationRelations = relations(notificationTable, ({ one }) => ({
    recipient: one(userTable, { fields: [notificationTable.recipient_user_id], references: [userTable.user_id] }),
}));
export const eventRelations = relations(eventTable, ({ one, many }) => ({
    school: one(schoolTable, { fields: [eventTable.school_id], references: [schoolTable.school_id] }),
    creator: one(userTable, { fields: [eventTable.created_by_user_id], references: [userTable.user_id], relationName: 'eventsCreated' }),
    consentRequests: many(consentRequestTable),
}));
export const documentRelations = relations(documentTable, ({ one }) => ({
    school: one(schoolTable, { fields: [documentTable.school_id], references: [schoolTable.school_id] }),
    student: one(studentTable, { fields: [documentTable.student_id], references: [studentTable.student_id] }),
    uploader: one(userTable, { fields: [documentTable.uploaded_by_user_id], references: [userTable.user_id] }),
}));
export const supportTicketRelations = relations(supportTicketTable, ({ one }) => ({
    school: one(schoolTable, { fields: [supportTicketTable.school_id], references: [schoolTable.school_id] }),
    requester: one(userTable, { fields: [supportTicketTable.requester_user_id], references: [userTable.user_id], relationName: 'requesterTickets' }),
    assignee: one(userTable, { fields: [supportTicketTable.assignee_id], references: [userTable.user_id], relationName: 'assignedTickets' }),
}));

// --- Security ---
export const userSessionRelations = relations(userSessionTable, ({ one }) => ({
    user: one(userTable, { fields: [userSessionTable.user_id], references: [userTable.user_id] }),
}));
export const apiKeyRelations = relations(apiKeyTable, ({ one }) => ({
    user: one(userTable, { fields: [apiKeyTable.user_id], references: [userTable.user_id] }),
}));
export const passwordHistoryRelations = relations(passwordHistoryTable, ({ one }) => ({
    user: one(userTable, { fields: [passwordHistoryTable.user_id], references: [userTable.user_id] }),
}));
export const permissionRelations = relations(permissionTable, ({ many }) => ({
    rolePermissions: many(rolePermissionTable),
}));
export const rolePermissionRelations = relations(rolePermissionTable, ({ one }) => ({
    permission: one(permissionTable, { fields: [rolePermissionTable.permission_id], references: [permissionTable.id] }),
}));
export const auditLogRelations = relations(auditLogTable, ({ one }) => ({
    user: one(userTable, { fields: [auditLogTable.user_id], references: [userTable.user_id] }),
    school: one(schoolTable, { fields: [auditLogTable.school_id], references: [schoolTable.school_id] }),
}));
export const passwordResetTokenRelations = relations(passwordResetTokenTable, ({ one }) => ({
  user: one(userTable, { fields: [passwordResetTokenTable.user_id], references: [userTable.user_id] }),
}));

// ============================================
//         Inferred Types for ALL Tables
// ============================================
export type TNewUser = typeof userTable.$inferInsert; export type TNewSchool = typeof schoolTable.$inferInsert;
export type TPlanInsert = typeof planTable.$inferInsert; export type TPlanSelect = typeof planTable.$inferSelect;
export type TSubscriptionInsert = typeof subscriptionTable.$inferInsert; export type TSubscriptionSelect = typeof subscriptionTable.$inferSelect;
export type TPlatformInvoiceInsert = typeof platformInvoiceTable.$inferInsert; export type TPlatformInvoiceSelect = typeof platformInvoiceTable.$inferSelect;
export type TPlatformPaymentInsert = typeof platformPaymentTable.$inferInsert; export type TPlatformPaymentSelect = typeof platformPaymentTable.$inferSelect;
export type TSchoolConfigurationInsert = typeof schoolConfigurationTable.$inferInsert; export type TSchoolConfigurationSelect = typeof schoolConfigurationTable.$inferSelect;
export type TSchoolInsert = typeof schoolTable.$inferInsert; export type TSchoolSelect = typeof schoolTable.$inferSelect;
export type TUserInsert = typeof userTable.$inferInsert; export type TUserSelect = typeof userTable.$inferSelect;
export type TUserRoleLinkInsert = typeof userRoleLinkTable.$inferInsert; export type TUserRoleLinkSelect = typeof userRoleLinkTable.$inferSelect;
export type TPositionInsert = typeof positionTable.$inferInsert; export type TPositionSelect = typeof positionTable.$inferSelect;
export type TDepartmentInsert = typeof departmentTable.$inferInsert; export type TDepartmentSelect = typeof departmentTable.$inferSelect;
export type TDepartmentMembershipInsert = typeof departmentMembershipTable.$inferInsert; export type TDepartmentMembershipSelect = typeof departmentMembershipTable.$inferSelect;
export type TFunctionalAssignmentInsert = typeof functionalAssignmentTable.$inferInsert; export type TFunctionalAssignmentSelect = typeof functionalAssignmentTable.$inferSelect;
export type TStudentInsert = typeof studentTable.$inferInsert; export type TStudentSelect = typeof studentTable.$inferSelect;
export type TParentStudentLinkInsert = typeof parentStudentLinkTable.$inferInsert; export type TParentStudentLinkSelect = typeof parentStudentLinkTable.$inferSelect;
export type TConsentRequestInsert = typeof consentRequestTable.$inferInsert; export type TConsentRequestSelect = typeof consentRequestTable.$inferSelect;
export type TConsentResponseInsert = typeof consentResponseTable.$inferInsert; export type TConsentResponseSelect = typeof consentResponseTable.$inferSelect;
export type TBoardOfManagementInsert = typeof boardOfManagementTable.$inferInsert; export type TBoardOfManagementSelect = typeof boardOfManagementTable.$inferSelect;
export type TBoardMemberInsert = typeof boardMemberTable.$inferInsert; export type TBoardMemberSelect = typeof boardMemberTable.$inferSelect;
export type TMeetingInsert = typeof meetingTable.$inferInsert; export type TMeetingSelect = typeof meetingTable.$inferSelect;
export type TMeetingAgendaItemInsert = typeof meetingAgendaItemTable.$inferInsert; export type TMeetingAgendaItemSelect = typeof meetingAgendaItemTable.$inferSelect;
export type TMeetingMinutesInsert = typeof meetingMinutesTable.$inferInsert; export type TMeetingMinutesSelect = typeof meetingMinutesTable.$inferSelect;
export type TActionItemInsert = typeof actionItemTable.$inferInsert; export type TActionItemSelect = typeof actionItemTable.$inferSelect;
export type TAcademicYearInsert = typeof academicYearTable.$inferInsert; export type TAcademicYearSelect = typeof academicYearTable.$inferSelect;
export type TTermInsert = typeof termTable.$inferInsert; export type TTermSelect = typeof termTable.$inferSelect;
export type TClassInsert = typeof classTable.$inferInsert; export type TClassSelect = typeof classTable.$inferSelect;
export type TSubjectInsert = typeof subjectTable.$inferInsert; export type TSubjectSelect = typeof subjectTable.$inferSelect;
export type TStudentEnrollmentInsert = typeof studentEnrollmentTable.$inferInsert; export type TStudentEnrollmentSelect = typeof studentEnrollmentTable.$inferSelect;
export type TTeacherSubjectAssignmentInsert = typeof teacherSubjectAssignmentTable.$inferInsert; export type TTeacherSubjectAssignmentSelect = typeof teacherSubjectAssignmentTable.$inferSelect;
export type TAssessmentInsert = typeof assessmentTable.$inferInsert; export type TAssessmentSelect = typeof assessmentTable.$inferSelect;
export type TCourseInsert = typeof courseTable.$inferInsert; export type TCourseSelect = typeof courseTable.$inferSelect;
export type TCourseModuleInsert = typeof courseModuleTable.$inferInsert; export type TCourseModuleSelect = typeof courseModuleTable.$inferSelect;
export type TLessonContentInsert = typeof lessonContentTable.$inferInsert; export type TLessonContentSelect = typeof lessonContentTable.$inferSelect;
export type TStudentContentProgressInsert = typeof studentContentProgressTable.$inferInsert; export type TStudentContentProgressSelect = typeof studentContentProgressTable.$inferSelect;
export type TAssignmentInsert = typeof assignmentTable.$inferInsert; export type TAssignmentSelect = typeof assignmentTable.$inferSelect;
export type TStudentSubmissionInsert = typeof studentSubmissionTable.$inferInsert; export type TStudentSubmissionSelect = typeof studentSubmissionTable.$inferSelect;
export type TQuizInsert = typeof quizTable.$inferInsert; export type TQuizSelect = typeof quizTable.$inferSelect;
export type TQuizQuestionInsert = typeof quizQuestionTable.$inferInsert; export type TQuizQuestionSelect = typeof quizQuestionTable.$inferSelect;
export type TQuestionOptionInsert = typeof questionOptionTable.$inferInsert; export type TQuestionOptionSelect = typeof questionOptionTable.$inferSelect;
export type TQuizAttemptInsert = typeof quizAttemptTable.$inferInsert; export type TQuizAttemptSelect = typeof quizAttemptTable.$inferSelect;
export type TStudentAnswerInsert = typeof studentAnswerTable.$inferInsert; export type TStudentAnswerSelect = typeof studentAnswerTable.$inferSelect;
export type TDisciplineIncidentInsert = typeof disciplineIncidentTable.$inferInsert; export type TDisciplineIncidentSelect = typeof disciplineIncidentTable.$inferSelect;
export type TVenueInsert = typeof venueTable.$inferInsert; export type TVenueSelect = typeof venueTable.$inferSelect;
export type TTimetableSlotInsert = typeof timetableSlotTable.$inferInsert; export type TTimetableSlotSelect = typeof timetableSlotTable.$inferSelect;
export type TLessonInsert = typeof lessonTable.$inferInsert; export type TLessonSelect = typeof lessonTable.$inferSelect;
export type TGroupInsert = typeof groupTable.$inferInsert; export type TGroupSelect = typeof groupTable.$inferSelect;
export type TGroupMembershipInsert = typeof groupMembershipTable.$inferInsert; export type TGroupMembershipSelect = typeof groupMembershipTable.$inferSelect;
export type TLeadershipPositionInsert = typeof leadershipPositionTable.$inferInsert; export type TLeadershipPositionSelect = typeof leadershipPositionTable.$inferSelect;
export type TFeeStructureInsert = typeof feeStructureTable.$inferInsert; export type TFeeStructureSelect = typeof feeStructureTable.$inferSelect;
export type TInvoiceInsert = typeof invoiceTable.$inferInsert; export type TInvoiceSelect = typeof invoiceTable.$inferSelect;
export type TPaymentInsert = typeof paymentTable.$inferInsert; export type TPaymentSelect = typeof paymentTable.$inferSelect;
export type TChatConversationInsert = typeof chatConversationTable.$inferInsert; export type TChatConversationSelect = typeof chatConversationTable.$inferSelect;
export type TChatParticipantInsert = typeof chatParticipantTable.$inferInsert; export type TChatParticipantSelect = typeof chatParticipantTable.$inferSelect;
export type TChatMessageInsert = typeof chatMessageTable.$inferInsert; export type TChatMessageSelect = typeof chatMessageTable.$inferSelect;
export type TNotificationInsert = typeof notificationTable.$inferInsert; export type TNotificationSelect = typeof notificationTable.$inferSelect;
export type TEventInsert = typeof eventTable.$inferInsert; export type TEventSelect = typeof eventTable.$inferSelect;
export type TDocumentInsert = typeof documentTable.$inferInsert; export type TDocumentSelect = typeof documentTable.$inferSelect;
export type TSupportTicketInsert = typeof supportTicketTable.$inferInsert; export type TSupportTicketSelect = typeof supportTicketTable.$inferSelect;
export type TUserSessionInsert = typeof userSessionTable.$inferInsert; export type TUserSessionSelect = typeof userSessionTable.$inferSelect;
export type TApiKeyInsert = typeof apiKeyTable.$inferInsert; export type TApiKeySelect = typeof apiKeyTable.$inferSelect;
export type TPasswordHistoryInsert = typeof passwordHistoryTable.$inferInsert; export type TPasswordHistorySelect = typeof passwordHistoryTable.$inferSelect;
export type TPermissionInsert = typeof permissionTable.$inferInsert; export type TPermissionSelect = typeof permissionTable.$inferSelect;
export type TRolePermissionInsert = typeof rolePermissionTable.$inferInsert; export type TRolePermissionSelect = typeof rolePermissionTable.$inferSelect;
export type TAuditLogInsert = typeof auditLogTable.$inferInsert; export type TAuditLogSelect = typeof auditLogTable.$inferSelect;
export type TPasswordResetTokenInsert = typeof passwordResetTokenTable.$inferInsert; export type TPasswordResetTokenSelect = typeof passwordResetTokenTable.$inferSelect;