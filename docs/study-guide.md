# Study guide: the job listing's technologies

A glossary-style refresher on GraphQL, OAuth, Terraform, FastAPI, microservices and AWS storage. Each term is defined the first time it appears.

## 0. Shared foundations

- **Client and server:** the client asks (a browser, a phone app, another program); the server answers.
- **HTTP:** the protocol they speak. A **request** has a **method** (`GET` to read, `POST` to create or send, `PUT`/`PATCH` to change, `DELETE`), a **URL**, **headers** (metadata such as `Content-Type` or `Authorization`), and an optional **body** (the data).
- **Status code:** the number on a response. 2xx means success, 3xx redirect, 4xx the client's mistake (400 bad request, 401 not signed in, 403 not allowed, 404 not found), 5xx the server's mistake.
- **JSON:** the text format most APIs exchange, which looks like a JavaScript object literal.
- **API:** the set of operations one program exposes for others to call.
- **Endpoint:** one address on an API, such as `GET /tanks/42`.
- **REST:** the conventional API style: one URL per resource, with the HTTP method saying what to do to it.

## 1. GraphQL

A query language for APIs. There is one endpoint; the client sends a document describing the data it wants and gets JSON back in that shape.

```graphql
query {
  tank(id: "42") {
    name
    livestock { quantity species { commonName } }
  }
}
```

### The schema

- **Schema:** the full description of what the API offers. The server rejects any request that doesn't fit it.
- **SDL (schema definition language):** the syntax the schema is written in.
- **Type:** a named shape of data. An **object type** (`Tank`) has **fields** (`name`, `volumeLiters`).
- **Scalar:** a single value rather than an object. Built in: `Int`, `Float`, `String`, `Boolean`, `ID`.
- **Enum:** a type limited to a fixed list of values, like our `WaterType`.
- **Non-null (`!`):** the value is never null. `[Tank!]!` is a list that is never null and never contains null.
- **Argument:** a parameter on a field, like `id` in `tank(id: "42")`.
- **Input type:** an object shape used only as an argument, like `CreateTankInput`.
- **Root types:** the entry points. `Query` reads, `Mutation` writes, `Subscription` streams updates (usually over a **WebSocket**, a connection that stays open).

### Requests

- **Operation:** one query, mutation or subscription sent by the client.
- **Selection set:** the `{ ... }` block listing the fields you want.
- **Variables:** values passed separately from the query text (`$id`), so the text stays fixed and values are never pasted into strings.
- **Fragment:** a reusable, named selection set.
- **Introspection:** querying the schema itself; this is how tools get autocomplete.

### Server side

- **Resolver:** the function that produces one field's value. Its arguments are `parent` (the object this field belongs to), `args`, `context`, and `info` (details of the query). Ours are in `server/src/resolvers.ts`.
- **Default resolver:** if you don't write one, GraphQL reads the property with the same name from `parent`. That's why `Tank.name` needs no code.
- **Context:** an object built once per request and shared by all resolvers; it holds the database client and current user.
- **Apollo Server / Apollo Client:** the popular server library and React client library. The client keeps a **normalized cache**: each object stored once by type and ID, so an update appears everywhere on screen.
- **Codegen:** generating TypeScript types from the schema so client and server can't drift apart.

### Problems to know

- **Over-fetching / under-fetching:** REST returning more than you need, or forcing several calls. GraphQL's main selling point is avoiding both.
- **N+1 queries:** one query for a list, then one more per item. **DataLoader** fixes it by **batching** (collecting the IDs requested in one moment and running a single query).
- **Errors:** a response is usually HTTP 200 with `data` and an `errors` array, and can contain both (partial data). Error types go in `extensions.code`.
- **Pagination:** returning a list in pages. **Offset** pagination says "skip 40, take 20"; **cursor** pagination says "20 after this item" and stays stable when rows are added.
- **Query depth/complexity limits:** since clients write their own queries, servers cap how deep or expensive one may be.
- **Versus REST:** no over- or under-fetching and strong typing, but HTTP caching, file uploads and rate limiting are harder.

## 2. OAuth 2.0 and OpenID Connect

- **Authentication:** proving who you are. **Authorization:** deciding what you may do.
- **OAuth 2.0:** a standard for letting an app access something on a user's behalf without seeing their password.

### The four roles

- **Resource owner:** the user.
- **Client:** your app.
- **Authorization server:** the provider's sign-in and consent service (Google, GitHub).
- **Resource server:** the API holding the user's data.

### Setup terms

- **Client ID / client secret:** your app's public identifier and its password, issued when you register the app with the provider.
- **Confidential vs public client:** a server can keep a secret; a browser or mobile app can't.
- **Redirect URI:** the address the provider sends the user back to. It must match what you registered exactly.
- **Scope:** a named permission being requested, such as `email`.
- **Consent:** the "Allow this app to…" screen.
- **Grant type (flow):** the sequence of steps used to get tokens.

### Authorization code flow

1. Your app redirects the browser to the provider with the client ID, redirect URI, scopes, `state`, and a `code_challenge`.
2. The user signs in and consents.
3. The provider redirects back with an **authorization code**: single-use and valid for about a minute.
4. Your server sends the code, client secret and `code_verifier` to the provider's **token endpoint** and receives tokens.

- **`state`:** a random value you send and check on return. It blocks **CSRF** (cross-site request forgery: another site tricking the user's browser into making a request to yours).
- **PKCE** (pronounced "pixy"): your app invents a random `code_verifier` and sends only its **hash** (a one-way fingerprint) as the `code_challenge`. A stolen code is useless without the verifier.
- **Client credentials flow:** a different flow with no user, used for one service calling another.

### Tokens

- **Access token:** a short-lived credential sent on each API call as `Authorization: Bearer <token>`. "Bearer" means whoever holds it can use it.
- **Refresh token:** longer-lived, used only to obtain new access tokens.
- **OpenID Connect (OIDC):** a layer on OAuth that adds identity. It returns an **ID token** saying who signed in. This is what "Sign in with Google" uses.
- **JWT (JSON Web Token):** a token format with three base64-encoded parts: header, payload, signature. Anyone can read it; nobody can alter it undetected. It is signed, not encrypted.
- **Claims:** fields in the payload. `sub` is the user's ID, `iss` the issuer, `aud` the intended audience, `exp` the expiry. Validate the signature, `exp`, `iss` and `aud`.
- **Signature / JWKS:** the provider signs with a private key; you verify with its public keys, published at a JWKS URL.

### After sign-in

- **Session:** your server's record that this browser is signed in.
- **Cookie:** a small value the browser stores and sends back automatically. `HttpOnly` hides it from JavaScript, `Secure` restricts it to HTTPS, `SameSite` limits cross-site sending.

## 3. Terraform

- **Infrastructure:** the servers, databases, networks and storage an app runs on.
- **Provisioning:** creating that infrastructure.
- **Infrastructure as code (IaC):** defining it in version-controlled files instead of clicking in a console.
- **Declarative:** you describe the end result and the tool works out the steps. (**Imperative** means writing the steps yourself.)
- **HCL:** Terraform's configuration language, in `.tf` files.

```hcl
resource "aws_s3_bucket" "photos" {
  bucket = "aquarium-photos-${var.env}"
}
```

### Building blocks

- **Provider:** a plugin that knows one platform's API (`aws`, `github`).
- **Resource:** one thing to create, written `resource "aws_s3_bucket" "photos" { ... }`: a type, then your local name.
- **Arguments / attributes:** values you set, and values known after creation (such as a database's address).
- **Reference:** using one resource's attribute in another, such as `aws_s3_bucket.photos.arn`. Terraform builds a **dependency graph** from references to decide creation order.
- **Data source:** a read-only lookup of something that already exists.
- **Variable / local / output:** an input, an internal named value, and a value printed or exported after apply.
- **Module:** a folder of `.tf` files used as a reusable unit. The folder you run in is the **root module**.

### Workflow

- **`terraform init`:** downloads providers and sets up the backend.
- **`terraform plan`:** shows what would be added (`+`), changed (`~`) or destroyed (`-`).
- **`terraform apply`:** carries out the plan. **`terraform destroy`** removes everything.
- **Idempotent:** running it again with no changes does nothing.
- **Forces replacement:** some changes can't be made in place, so Terraform destroys and recreates the resource. Watch for this on databases.

### State

- **State:** a file recording which real resource corresponds to each block in your config.
- **Backend / remote state:** where state is stored. Teams keep it in shared storage such as S3.
- **State locking:** prevents two people applying at once.
- **Drift:** real infrastructure differing from state because someone changed it by hand. The next `plan` shows the difference.
- **Secrets:** state can contain passwords in plain text, so it's kept out of git and access-controlled.
- **`.tfvars`:** files of variable values, often one per environment.
- **Lock file (`.terraform.lock.hcl`):** pins provider versions; this one is committed.

## 4. FastAPI

A Python framework for building HTTP APIs. It's the Python counterpart to Express, with validation built in.

```python
class CheckRequest(BaseModel):
    tank_liters: float
    species_ids: list[int]

@app.post("/compatibility")
async def check(req: CheckRequest) -> CheckResult:
    ...
```

- **Type hints:** Python's optional type annotations (`name: str`). FastAPI reads them at runtime to validate input.
- **Decorator:** the `@something` line above a function, which wraps or registers it. `@app.get("/tanks")` registers a route.
- **Route (path operation):** a method plus a path, bound to a function.
- **Path parameter:** a variable part of the URL (`/tanks/{tank_id}`).
- **Query parameter:** a value after `?` (`/species?search=tetra`).
- **Request body:** the JSON sent with a POST or PUT.
- **Pydantic model:** a class declaring the fields and types of a piece of data. Same idea as the zod schema in `server/scripts/import-species.ts`.
- **Validation:** checking input matches the model. On failure FastAPI returns **422** listing each bad field.
- **Serialization:** converting objects to JSON for the response. A **response model** filters and validates what goes out.
- **`HTTPException`:** what you raise to return an error status.
- **OpenAPI:** a standard machine-readable description of a REST API. FastAPI generates it and serves interactive docs (**Swagger UI**) at `/docs`.
- **ASGI:** the async interface between Python web servers and apps. The older, synchronous one is **WSGI** (used by Flask and Django).
- **Uvicorn:** the ASGI server that actually runs your app.
- **`async` / `await`:** same idea as in JavaScript. Use `async def` for handlers that await I/O; plain `def` handlers run in a thread pool instead.
- **Dependency injection (`Depends`):** declaring what a handler needs (a database session, the current user) and letting the framework supply it.
- **Middleware:** code that runs around every request, for logging or CORS.
- **CORS:** the browser rule that blocks a page calling an API on a different origin unless that API allows it.
- **Virtual environment (venv):** an isolated set of Python packages per project, like `node_modules`.
- **`pip` / `requirements.txt`:** the package installer and the dependency list, like npm and `package.json`.
- **pytest / `TestClient`:** the standard test runner, and FastAPI's helper for calling your app in tests.

## 5. Microservices and distributed systems

- **Monolith:** one application, one codebase, one deployment.
- **Microservices:** many small services, each deployed on its own and usually owning its own data.
- **Distributed system:** any system whose parts run on different machines and talk over a network.
- **Service boundary:** the decision about what one service is responsible for.
- **API contract:** the agreed request and response shapes between services.
- **Trade-off:** independent deployment and scaling, in exchange for harder debugging, eventual consistency, and more operational work.

### Communication

- **Synchronous:** the caller waits for the answer (HTTP, or **gRPC**, a faster binary protocol with strict schemas).
- **Asynchronous:** the caller hands off a message and moves on.
- **Message queue:** a buffer holding messages until a worker takes them (AWS SQS).
- **Producer / consumer:** who sends and who processes.
- **Event:** a message saying something happened ("water test recorded").
- **Pub/sub:** publishers emit events to a topic; any number of subscribers receive them.
- **At-least-once delivery:** a message may arrive twice, so consumers must cope with duplicates.

### Failure handling

- **Timeout:** giving up on a call after a set time.
- **Retry with exponential backoff:** trying again after 1s, 2s, 4s… **Jitter** adds randomness so clients don't all retry together.
- **Idempotent:** doing it twice has the same effect as once. An **idempotency key** is a unique ID sent with a request so the server can recognise a repeat. The species import's upsert is an example of an idempotent operation.
- **Circuit breaker:** after repeated failures, stop calling a broken service for a while and fail fast.
- **Graceful degradation:** keep working with reduced features when a dependency is down.

### Scaling and consistency

- **Latency / throughput:** how long one request takes; how many are handled per second.
- **Vertical / horizontal scaling:** a bigger machine; more machines.
- **Load balancer:** spreads requests across copies of a service.
- **Stateless:** a service keeps nothing in memory between requests, so any copy can handle any request.
- **Eventual consistency:** after a change, different services may briefly disagree but will converge.
- **API gateway:** a single front door that routes requests to the right service.

### Operations

- **Container / image:** a packaged app with its dependencies (Docker); the image is the template, the container the running copy.
- **CI/CD:** automated testing and deployment on every change.
- **Observability:** understanding a running system through **logs** (text records), **metrics** (numbers over time), and **traces** (one request followed across services).
- **Correlation ID:** an ID passed along with a request so its logs can be found in every service.
- **Health check:** an endpoint reporting whether a service is alive.

## 6. AWS storage

### Account basics

- **Region / availability zone (AZ):** a geographic area (`us-east-1`); an isolated data centre within it.
- **IAM:** the permission system.
- **Principal:** who is acting, either an **IAM user** (a person or program with long-lived keys) or a **role** (an identity that is assumed temporarily, preferred for services).
- **Policy:** a JSON document listing allowed or denied **actions** (`s3:PutObject`) on **resources**.
- **Least privilege:** grant only what is needed.
- **ARN:** the unique ID of any AWS resource.
- **Access keys:** an ID and secret used to sign API calls. Never commit them.
- **SDK:** the library your code uses to call AWS (`@aws-sdk/client-s3` in Node).

### S3 (file storage)

- **Object storage:** whole files stored by name, with no real folders and no partial edits.
- **Bucket:** a top-level container with a globally unique name.
- **Object / key:** the file and its full name (`tanks/42/photo.jpg`). A **prefix** is the folder-like start of a key.
- **Block Public Access:** the default setting that keeps buckets private.
- **Presigned URL:** a link your server signs that permits one action on one object for a limited time. The browser uploads straight to S3 with it, so files never pass through your server.
- **Bucket CORS:** needed before a browser can upload directly.
- **Versioning:** keeps old copies when objects are overwritten or deleted.
- **Lifecycle rule:** automatically moves or deletes objects after a time.
- **Storage class:** a price tier by access frequency (Standard, Infrequent Access, Glacier).
- **Encryption at rest / in transit:** encrypted on disk; encrypted while travelling (HTTPS).

### RDS (managed PostgreSQL)

- **Managed database:** AWS runs the server, patches and backups; you use it like any Postgres.
- **Instance / instance class:** the database server and its size (`db.t4g.micro`).
- **Endpoint:** the hostname in your connection string.
- **Multi-AZ:** a standby copy in another AZ with automatic **failover**.
- **Read replica:** a read-only copy for spreading query load.
- **Snapshot / point-in-time recovery:** a full backup; restoring to any moment in the retention window.
- **Connection pooling:** reusing a small set of database connections, since each one is costly.

### Networking and secrets

- **VPC:** your private network inside AWS.
- **Subnet:** a slice of it. **Public** subnets are reachable from the internet; databases belong in **private** ones.
- **Security group:** a firewall on a resource, such as "allow port 5432 only from the API".
- **Secrets Manager:** stores passwords and keys so they stay out of code.
