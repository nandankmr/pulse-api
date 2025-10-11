
# Node.js + TypeScript Backend Best Practices

## 1. **Project Structure**

* Use a **modular and layered structure** (e.g., controllers, services, repositories, models, routes).
* Keep `src/` for source code, `tests/` for tests, `config/` for configurations, and `scripts/` for automation.
* Group related files together by feature rather than type when appropriate (feature-based architecture).

**Example:**

```
src/
  modules/
    user/
      user.controller.ts
      user.service.ts
      user.repository.ts
      user.model.ts
      user.routes.ts
  shared/
    middleware/
    utils/
    constants/
config/
tests/
scripts/
```

---

## 2. **TypeScript Usage**

* Always **enable strict mode** (`strict: true` in tsconfig.json).
* Use **interfaces and types** instead of `any`.
* Avoid `as` type assertions unless necessary.
* Prefer **readonly** and **immutable objects** where applicable.
* Use **enums** for constants with predefined values.

---

## 3. **Code Style & Quality**

* Use **Prettier** for consistent formatting.
* Use **ESLint** with TypeScript plugin to enforce rules.
* Always use **camelCase** for variables and functions, **PascalCase** for classes and types.
* Keep **functions small and single-responsibility**.
* Avoid deeply nested callbacks; prefer `async/await`.

---

## 4. **Error Handling**

* Always handle errors in async code with `try/catch`.
* Use **custom error classes** for domain-specific errors.
* Send consistent error responses (HTTP status + message + optional code).
* Avoid sending raw error stacks in production.

**Example:**

```ts
class NotFoundError extends Error {
  statusCode = 404;
  constructor(message: string) { super(message); }
}
```

---

## 5. **API Design**

* Follow **RESTful principles** or **GraphQL best practices** consistently.
* Validate inputs using **class-validator** or **Joi**.
* Sanitize all user input to prevent injection attacks.
* Use **HTTP status codes correctly** (e.g., 200 OK, 201 Created, 400 Bad Request, 404 Not Found, 500 Internal Server Error).
* Paginate large responses.

---

## 6. **Database & ORM**

* Use **parameterized queries** to prevent SQL injection.
* Define **TypeScript types/interfaces** for all database entities.
* Prefer **transactions** when multiple DB operations must succeed/fail together.
* Apply **soft delete** rather than physical deletion when needed.

---

## 7. **Authentication & Authorization**

* Use **JWT or OAuth2** for authentication.
* Hash passwords with **bcrypt or argon2**.
* Never store sensitive information in plaintext.
* Implement **role-based access control**.
* Validate JWT tokens on each request.

---

## 8. **Security**

* Do not commit `.env` or secret files.
* Use **Helmet** for HTTP headers protection.
* Enable **CORS** selectively.
* Regularly update dependencies to patch vulnerabilities.
* Rate-limit sensitive endpoints to prevent abuse.

---

## 9. **Logging & Monitoring**

* Use structured logging (`winston`, `pino`).
* Log **error, warning, info** levels separately.
* Avoid logging sensitive information (passwords, tokens).
* Integrate monitoring & alerting (e.g., Prometheus, Grafana, Sentry).

---

## 10. **Testing**

* Write **unit tests** for services and utility functions.
* Write **integration tests** for routes and database interaction.
* Use **mocking/stubbing** for external dependencies.
* Achieve **minimum 80% test coverage**.
* Run tests in CI/CD pipelines.

---

## 11. **Async & Performance**

* Prefer **async/await** over callbacks.
* Avoid blocking the event loop (no heavy computation in main thread).
* Use **caching** for frequent queries (Redis, in-memory, etc.).
* Apply **pagination, streaming, and batching** for large data sets.

---

## 12. **Dependency Management**

* Keep `package.json` clean and up-to-date.
* Use **exact versions** (`npm install package@1.2.3`) for critical dependencies.
* Audit dependencies for vulnerabilities regularly (`npm audit`).
* Avoid unnecessary heavy dependencies.

---

## 13. **Environment & Config**

* Use `.env` files for environment variables.
* Validate config at startup using **zod**, **joi**, or **env-schema**.
* Different configs for **development, staging, production**.

---

## 14. **Documentation**

* Document functions, classes, and endpoints using **JSDoc or TypeDoc**.
* Maintain **API docs** (Swagger/OpenAPI).
* Keep **README** updated with setup instructions and scripts.

---

## 15. **CI/CD**

* Run linting, formatting, and tests on each pull request.
* Build TypeScript before deployment.
* Use **zero-downtime deployment** if possible.
* Ensure secrets are injected securely in pipelines.
