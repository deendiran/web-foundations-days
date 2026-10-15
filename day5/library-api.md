# Library Books REST API Design

A RESTful API specification for managing a library's books collection.

## Endpoints

### 1. List All Books
- **Method:** GET
- **Path:** /books
- **Description:** Retrieves a list of all books in the library.
- **Request Body:** None
- **Success Status Code:** 200 OK

### 2. Get a Single Book
- **Method:** GET
- **Path:** /books/{id}
- **Description:** Retrieves details of a specific book by its ID.
- **Request Body:** None
- **Success Status Code:** 200 OK

### 3. Create a Book
- **Method:** POST
- **Path:** /books
- **Description:** Adds a new book to the library collection.
- **Request Body:**
  ```json
  {
    "title": "To Kill a Mockingbird",
    "author": "Harper Lee",
    "isbn": "9780061120084",
    "publishedYear": 1960
  }
- **Success Status Code:** 201 Created

### 4. Update a Book
- **Method:** PUT
- **Path:** /books/{id}
- **Description:** Updates an existing book by its ID.
- **Request Body:**
  ```json
  {
    "title": "Updated Title",
    "author": "Updated Author",
    "isbn": "Updated ISBN",
    "publishedYear": 1960
  }
  ```
- **Success Status Code:** 200 OK

### 5. Delete a Book
- **Method:** DELETE
- **Path:** /books/{id}
- **Description:** Deletes a book by its ID.
- **Request Body:** None
- **Success Status Code:** 204 No Content

### 6. List Books by Author
- **Method:** GET
- **Path:** /books?author={authorName}
- **Description:** Filters and returns books by a specific author using a query parameter.
- **Request Body:** None
- **Success Status Code:** 200 OK

## Error Codes
### 400: Bad Request: Invalid request body or missing required fields
- **Description:** Returned when the client request is invalid or missing required data.
- **Example:** Sending a POST /books without a required `"title"` field or with an invalid data type e.g.
  ```json
  {"publishedYear": "invalid_year"}
  ```

### 404: Not Found: The requested resource (book) could not be found.
- **Description:** Returned when the requested resource does not exist on the server.
- **Example:** Sending a `GET /books/999` or `DELETE /books/999` when no book with ID 999 exists in the library database.

  
