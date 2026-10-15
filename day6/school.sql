-- CREATE TABLE statements for school.db (SQLite)

-- 1. Enable Foreign Key enforcement in SQLite
PRAGMA foreign_keys = ON;

-- 2. Drop tables if they exist (clean slate)
DROP TABLE IF EXISTS enrolments;
DROP TABLE IF EXISTS courses;
DROP TABLE IF EXISTS students;

-- 3. Students table (stores student information)
CREATE TABLE students (
    student_id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL
);

-- 4. Courses table (stores course information)
CREATE TABLE courses (
    course_id INTEGER PRIMARY KEY AUTOINCREMENT,
    course_name TEXT NOT NULL,
    course_code TEXT NOT NULL UNIQUE
);

-- 5. Enrolments table (stores student-course relationships - many-to-many)
CREATE TABLE enrolments (
    -- enrolment_id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER NOT NULL,
    course_id INTEGER NOT NULL,
    grade TEXT DEFAULT 'In Progress',
    enrolled_at TEXT DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (student_id, course_id),
    FOREIGN KEY (student_id) REFERENCES students(student_id) ON DELETE CASCADE,
    FOREIGN KEY (course_id) REFERENCES courses(course_id) ON DELETE CASCADE,
    UNIQUE(student_id, course_id) -- Prevents duplicate enrolments
);

-- Insert Students (4 students: 3 enrolled, 1 not enrolled)
INSERT INTO students (name, email) VALUES
    ('Alice Smith', 'alice@school.edu'),
    ('Bob Jones', 'bob@school.edu'),
    ('Charlie Brown', 'charlie@school.edu'),
    ('Diana Prince', 'diana@school.edu'); -- Diana has no enrolments

-- Insert Courses
INSERT INTO courses (course_name, course_code) VALUES
    ('Web Development', 'CS101'),
    ('Database Foundations', 'CS102'),
    ('Computer Networking', 'CS103');

-- Insert Enrolments (5 enrolments across Alice, Bob, and Charlie)
INSERT INTO enrolments (student_id, course_id, grade) VALUES
    (1, 1, 'A'),   -- Alice in Web Dev
    (1, 2, 'B'),   -- Alice in Databases
    (2, 1, 'B+'),  -- Bob in Web Dev
    (2, 3, 'A-'),  -- Bob in Networking
    (3, 2, 'A');   -- Charlie in Databases

-- -- The 5 Required Queries

-- 1. All courses for one student (by name)
-- Uses JOIN to link students, enrolments and courses filtered by name.
SELECT 
    s.name AS student_name,
    c.course_code,
    c.course_name,
    e.grade
FROM students s
JOIN enrolments e ON s.student_id = e.student_id
JOIN courses c ON e.course_id = c.course_id
WHERE s.name = 'Alice Smith';

-- 2. All students on one course
-- Retrieves all students and their grades for a specific course.
SELECT 
    c.course_name,
    s.name AS student_name,
    s.email,
    e.grade
FROM courses c
JOIN enrolments e ON c.course_id = e.course_id
JOIN students s ON e.student_id = s.student_id
WHERE c.course_name = 'Web Development';

-- 3. Number of students per course
-- Uses LEFT JOIN and GROUP BY so courses with 0 students still show up with count 0.
SELECT 
    c.course_id,
    c.course_name,
    COUNT(e.student_id) AS total_enrolled_students
FROM courses c
LEFT JOIN enrolments e ON c.course_id = e.course_id
GROUP BY c.course_id, c.course_name;

-- 4. Students who have no enrolments
-- Uses a LEFT JOIN on enrolments. When a student has no enrolment records, e.student_id evaluates to NULL.
SELECT 
    s.student_id,
    s.name,
    s.email
FROM students s
LEFT JOIN enrolments e ON s.student_id = e.student_id
WHERE e.student_id IS NULL;

-- 5. Update of one enrolment's grade
-- Modifies an existing record and retrieves it to confirm.

-- Update Charlie's grade in CS102 (course_id 2) to 'A+'
UPDATE enrolments
SET grade = 'A+'
WHERE student_id = 3 AND course_id = 2;

-- Verify the update
SELECT s.name, c.course_name, e.grade
FROM enrolments e
JOIN students s ON e.student_id = s.student_id
JOIN courses c ON e.course_id = c.course_id
WHERE e.student_id = 3 AND e.course_id = 2;
