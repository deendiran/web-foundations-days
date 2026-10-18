# Course Reflection

### 1. What was the most difficult concept in the course, and how did you overcome it?
The most challenging concept was understanding concurrency control and database transactions in distributed systems. Initially, grasping how race conditions emerge during high-volume operations—such as multiple users attempting to reserve the same resource—felt abstract. I overcame this hurdle by sketching step-by-step execution timelines, comparing optimistic versus pessimistic locking in SQL, and experimenting with database isolation levels alongside in-memory atomic locks in Redis. Seeing how constraints and transactions physically reject invalid states made the concept concrete.

### 2. Which part of your capstone would you improve, based on the feedback you received?
Reflecting on my Day 4 interactive web project (the Live Character Counter and Notes Toolkit), I received feedback regarding performance efficiency and accessibility. Currently, the application writes directly to `localStorage` on every keystroke. To improve it, I would implement a debounce mechanism to batch storage writes, refactor the monolithic script into modular ES functions, and introduce ARIA live regions (`aria-live="polite"`) so that screen readers announce approaching character limits cleanly without interrupting the user.

### 3. What will you learn next?
Next, I plan to dive deeper into full-stack backend engineering by building scalable RESTful microservices with Node.js and PostgreSQL. I want to gain hands-on experience setting up Redis caching clusters, managing asynchronous task queues with message brokers like RabbitMQ, and deploying containerized applications using Docker to turn architectural designs into reliable, live web applications.
