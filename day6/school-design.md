# School Database Design

## 1. Table Explanations
- **`students`**: Represents individual pupils. Stores immutable or unique identifiers such as `student_id`, `name`, and unique `email`.

- **`courses`**: Represents the curriculum catalog. Stores course identities such as `course_id`, `course_name`, and a unique `course_code`.

- **`enrolments`**: Acts as an associative entity (junction table) representing an active enrolment. It holds relational metadata, specifically foreign keys referencing `students` and `courses`, plus attributes belonging to that association (such as `grade` and `enrolled_at`).

## 2. Relationships & The Need for a Join Table
- **Student to Enrolment**: One-to-Many (1:N) — A single student can have multiple enrolment entries.
- **Course to Enrolment**: One-to-Many (1:N) — A single course can be enrolled by multiple students.
- **Student to Course**: Many-to-Many (M:N) — A student can attend many courses, and a course has many students.

- **Why a join table is needed**: Relational databases do not support storing multiple foreign keys or arrays within a single column without violating First Normal Form (1NF). A junction table (`enrolments`) decomposes the complex Many-to-Many relationship into two clean One-to-Many relationships and enforces uniqueness on the composite key `(student_id, course_id)` to prevent duplicate registrations.

## 3. Recommended Index
- **Index**: `CREATE INDEX idx_enrolments_course_id ON enrolments(course_id);`
- **Reason**: The composite primary key on `enrolments(student_id, course_id)` already creates a B-tree index starting with `student_id`. However, queries searching from the course perspective (e.g., finding all students on a course or counting enrolments per course) require fast lookups on `course_id`. In SQLite, foreign keys are not automatically indexed, so adding this index speeds up reverse joins and prevents full table scans.

## 4. SQL vs. NoSQL Architecture Selection
For a school management and grading system, a `relational SQL database` is the superior architectural choice. School data is inherently structured and relational, requiring strict ACID compliance and referential integrity (e.g., ensuring an enrolment cannot exist for a nonexistent student or deleted course via foreign key constraints). Relational databases also provide standardized querying for reporting—such as grade averages, student counts per class, and cross-table joins—without data duplication. A `NoSQL document database` would require either embedding enrolments (leading to unbounded document growth and race conditions during simultaneous grade updates) or manual application-level joins without referential integrity guarantees.
