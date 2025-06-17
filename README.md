# Project ShulePro: The School Operating System

## Database Schema Documentation

**Version:** 1.0
**Last Updated:** [Currently under  development]
**Contact:** [Eng Johnson Mwangi/Team]

## 1. Introduction

This document is the single source of truth for the database architecture of **Project ShulePro**, our next-generation, multi-tenant School Operating System. Its purpose is to provide a comprehensive guide for developers on the structure, relationships, and underlying principles of our data model.

Our mission is to build a platform that doesn't just manage school data but models the entire school as a **digital organism**. This schema is designed to be robust, scalable, secure, and flexible enough to support not only our initial feature set but also our long-term vision.

## 2. Core Architectural Principles

Understanding these principles is key to working with this schema effectively.

#### 2.1. The Digital Twin: Modeling the Org Chart

A school is not a flat list of users. It has a complex hierarchy. Our schema models this reality.

- **Roles vs. Positions:** A **Role** (e.g., `teacher`) defines _system permissions_ (what a user can do). A **Position** (e.g., `Deputy Principal - Academics`) is a formal _office_ a user holds.
- **Departments & Functional Units:** We model functional units like the "Science Department" and can assign roles like "Head of Department (HOD)" within them.
- **Ad-Hoc Responsibilities:** We can model any reporting line, such as an "Assistant to the DOS," creating a truly dynamic org chart.
  > **This enables context-aware automation that is our core competitive advantage.**

#### 2.2. Pervasive Archiving (Soft Deletes)

**We never truly delete core data.** Nearly every major table (`userTable`, `classTable`, `courseTable`, etc.) has an `archived_at` timestamp column.

- **Action:** Instead of `DELETE`, we `UPDATE` the `archived_at` field with the current timestamp. Queries for active data must include `WHERE archived_at IS NULL`.
- **Benefit:** This provides a complete, non-repudiable historical record. We can answer "Who was in Grade 5 North in 2022?" even if the class has since been archived. It makes data recovery and auditing trivial.

#### 2.3. Security as a Foundation, Not an Add-on

The schema is built with a security-first mindset.

- **Granular RBAC:** Permissions are not hard-coded. They are defined in the `permissionTable` and linked to roles via `rolePermissionTable`.
- **Multi-Layered Authentication:** Support for Two-Factor Authentication (`userTable.is_two_factor_enabled`), active session management (`userSessionTable`), and API key management (`apiKeyTable`) is built-in.
- **Complete Audit Trail:** The `auditLogTable` records every significant action performed by any user, providing full accountability.

#### 2.4. CBC-Native by Design

The academic module is built from the ground up for the Kenyan Competency-Based Curriculum. We track `strands`, `sub_strands`, and `performance_levels`, not just marks.

---

## 3. Module Breakdown

The schema is organized into logical, interconnected modules.

| Module                     | Purpose                                                                  | Key Tables                                          |
| :------------------------- | :----------------------------------------------------------------------- | :-------------------------------------------------- |
| **Core & Org Chart**       | Models the school's human and organizational structure.                  | `school`, `user`, `position`, `department`          |
| **Student & Community**    | Manages student profiles and parent/guardian engagement.                 | `student`, `parentStudentLink`, `consentRequest`    |
| **Governance & Meetings**  | Handles high-level administration and formal meetings.                   | `boardOfManagement`, `meeting`, `actionItem`        |
| **Academic Core**          | The CBC-native engine for classes, subjects, and assessments.            | `class`, `subject`, `assessment`                    |
| **E-Learning (LMS)**       | A robust platform for online courses, assignments, and quizzes.          | `course`, `assignment`, `quiz`, `studentSubmission` |
| **Operations & Logistics** | Manages the day-to-day running of the school.                            | `timetableSlot`, `disciplineIncident`, `group`      |
| **Finance**                | Automates fee structures, invoicing, and payment tracking.               | `feeStructure`, `invoice`, `payment`                |
| **Communication**          | Secure, contextual messaging and notifications.                          | `chatConversation`, `notification`                  |
| **Advanced Security**      | Provides foundational security features like 2FA and session management. | `userSession`, `apiKey`, `passwordHistory`          |
| **Audit & Permissions**    | The backbone of our security and accountability framework.               | `auditLog`, `permission`                            |

---

## 4. Detailed Schema Reference

This section details the purpose and key features of the tables within each module.

### 4.1. Core & Org Chart

#### `schoolTable`

- **Purpose:** Represents a single school tenant in our SaaS platform. The root of all tenant-specific data.
- **Key Columns:**
  - `school_id` (PK): The unique identifier for the tenant.
  - `settings` (JSONB): A powerful field for enabling/disabling features (e.g., chat, IP whitelisting) for a specific school without code changes.
  - `archived_at` (Timestamp): For soft-deleting an entire school tenant.

#### `userTable`

- **Purpose:** Represents a unique human being in the system. The central hub for all people.
- **Key Columns:**
  - `user_id` (PK): The global unique identifier for a person.
  - `school_id` (FK): Links the user to their primary school.
  - `is_two_factor_enabled` (Boolean): Flag for our 2FA security feature.
  - `archived_at` (Timestamp): Enables soft deletion of users.
- **Relationships:** A user can have many roles, hold positions, be a member of departments, be a parent, and more.

#### `userRoleLinkTable`

- **Purpose:** A crucial pivot table linking users to their system roles. Enables the multi-role architecture.
- **Key Columns:** `user_id`, `role`.
- **Note:** A single user can have a `parent` role and a `teacher` role simultaneously.

#### `positionTable`

- **Purpose:** Defines formal offices held by users (e.g., "Principal", "Deputy Principal").
- **Key Columns:** `user_id`, `title`, `start_date`, `end_date`.
- **Note:** Allows for multiple users to hold positions with the same `position_type` (e.g., two Deputy Principals).

#### `departmentTable` & `departmentMembershipTable`

- **Purpose:** Creates functional units ("Science Dept") and manages their members and leaders ("HOD").
- **Key Columns:** `name` (departmentTable), `user_id`, `membership_role` (departmentMembershipTable).

### 4.2. Academic & E-Learning (LMS)

#### `assessmentTable`

- **Purpose:** The core of our CBC-native functionality.
- **Key Columns:** `strand`, `sub_strand`, `learning_outcome`, `performance_level`, `score`.
- **Note:** This structure allows for rich, detailed academic reporting beyond simple percentages.

#### `courseTable`

- **Purpose:** Represents a single online course, usually linked to a `subject`.
- **Relationships:** A course is taught by one `teacher` and is composed of many `courseModuleTable` entries.

#### `courseModuleTable`

- **Purpose:** Provides structure within a course (e.g., "Module 1: Introduction to Algebra").
- **Key Columns:** `course_id`, `title`, `order`.
- **Relationships:** A module contains many `lessonContentTable` entries.

#### `lessonContentTable`

- **Purpose:** The actual learning material. Can be a video, PDF, text, or a link to an `assignment` or `quiz`.
- **Key Columns:** `module_id`, `content_type`.

#### `assignmentTable` & `studentSubmissionTable`

- **Purpose:** Manages homework assignments and tracks student submissions.
- **Functionality:** Teachers create an assignment with instructions and a due date. Students upload their work. Teachers can then grade and provide feedback.

#### `quizTable`, `quizQuestionTable`, `questionOptionTable`

- **Purpose:** A complete quiz engine.
- **Functionality:** Teachers can create quizzes with time limits, add multiple question types (multiple choice, T/F, short answer), and define correct answers.

#### `quizAttemptTable` & `studentAnswerTable`

- **Purpose:** Tracks every attempt a student makes on a quiz.
- **Functionality:** Records the student's start/end time, their chosen answers for each question, and the final calculated score.

### 4.3. Governance & Community

#### `boardOfManagementTable` & `boardMemberTable`

- **Purpose:** Models the school's official board and its members.
- **Note:** Links to the `userTable`, allowing a board member to also be a parent in the system with the same user account.

#### `meetingTable`, `meetingAgendaItemTable`, `meetingMinutesTable`, `actionItemTable`

- **Purpose:** Provides a full-featured system for managing formal meetings.
- **Functionality:** From scheduling and setting an agenda to recording minutes and assigning trackable action items with due dates. This creates an auditable record of all decisions.

#### `consentRequestTable` & `consentResponseTable`

- **Purpose:** Digitizes the process of obtaining parental consent for events like school trips.
- **Functionality:** Admins create a request, which sends notifications to relevant parents. Parents can approve or deny directly in the app. Admins get a real-time dashboard of responses.

### 4.4. Security & Auditing

#### `auditLogTable`

- **Purpose:** The system's immutable ledger. Provides a non-repudiable record of all significant actions.
- **Key Columns:** `user_id` (who), `action` (what), `table_name` & `record_pk` (on what), `old_data` & `new_data` (the change), `ip_address` (where), `created_at` (when).
- **Usage:** This table should be written to by application-level middleware/triggers after every critical CUD operation.

#### `userSessionTable`

- **Purpose:** Manages active user login sessions.
- **Functionality:** Allows a user (or admin) to see all devices where they are currently logged in and provides the ability to remotely log out a specific session.

#### `apiKeyTable`

- **Purpose:** For secure, programmatic access to our API (e.g., for future mobile apps or third-party integrations).
- **Security:** We only store a hash of the API key, not the key itself.

#### `passwordHistoryTable`

- **Purpose:** Prevents users from reusing their recent passwords, increasing account security.

---

## 5. Getting Started

1.  **Migrations:** Use Drizzle Kit (`drizzle-kit`) to generate and apply the initial database migration based on the final `schema.ts` file.
2.  **Seeding:** The `permissionTable` should be seeded with all possible application permissions upon initial setup (e.g., `user:create`, `invoice:read`, `assessment:update`).
3.  **Implementation:** When building application logic, always refer back to this documentation to understand the relationships and intended use of each table. Remember the core principles, especially **Pervasive Archiving** (use `archived_at` instead of `DELETE` and always query with `WHERE archived_at IS NULL` for active records).
