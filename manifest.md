# LAUTECH Student Resources Bank - Project Manifest

## Project Overview

A highly scalable academic repository and lecturer review platform for LAUTECH students. Features include structured file uploads, strict one-way commenting, a robust moderation pipeline, and role-based access control.

## Tech Stack

- **Frontend:** Next.js, TypeScript, Tailwind CSS, Shadcn UI
- **Backend:** Node.js, Express.js, TypeScript
- **Database:** MongoDB (with Mongoose & Transactions)
- **Storage:** Cloudinary / AWS S3
- **DevOps:** Git, Docker, Vercel (Frontend), Linux/VPS (Backend)

---

## Tracking Legend

- [ ] Pending
- [~] In Progress
- [x] Completed

---

## Phase 1: Planning & Architecture

- [x] Map out core features and moderation pipelines
- [x] Design schema mapping and database relationships
- [x] Initialize project manifest (`manifest.md`)
- [ ] Initialize Git repositories (Frontend & Backend)
- [ ] Set up continuous integration pipelines and linting

## Phase 2: Backend & Database Foundation

- [x] Set up Express server with secure architecture (helmet, cors, rate limiting)
- [~] Configure MongoDB connection and replica set for transactions
- [ ] Implement robust Authentication (JWT) and RBAC middleware
- [ ] Integrate Gemini API for multimodal file analysis (PDF/Images)
- [ ] Build User & Trust Score schemas and controllers
- [ ] Build structural schemas (Departments, Courses, Lecturers) with status flags
- [ ] Build Resource & Comment schemas
- [ ] Implement cloud file upload pipeline (Multer + Storage provider)
- [ ] Create aiAnalyzer utility to parse files and return strict JSON verdicts
- [ ] Update Resource upload controller to route through the AI Gatekeeper before Cloudinary.

## Phase 3: Core API Endpoints

- [ ] Auth routes (Register, Login, Role assignment)
- [ ] Resource upload routes (with staging area logic)
- [ ] Faceted search and filter endpoints for the frontend
- [ ] One-way commenting and voting (upvote/downvote) endpoints
- [ ] **Admin:** Transaction-based merge tool for duplicate entities
- [ ] **Admin:** Resource triage and approval endpoints
- [ ] Implement cloud file upload pipeline (Multer + Storage provider)
- [ ] Create aiAnalyzer utility to parse files and return strict JSON verdicts
- [ ] Update Resource upload controller to route through the AI Gatekeeper before Cloudinary.

## Phase 4: Frontend Development (Student-Facing)

- [ ] Initialize Next.js project with Tailwind CSS and Shadcn UI
- [ ] Build global layout, navigation, and authentication flows
- [ ] Build the Faceted Search Dashboard
- [ ] Build the "Search-First" Upload flow
- [ ] Build Aggregated Lecturer Profiles (Courses, Resources, Comments)
- [ ] Integrate in-browser file previews for PDFs and images

## Phase 5: Moderation UI & Admin Dashboard

- [ ] Build Admin layout and protected route wrappers
- [ ] Build the Resource Triage interface (Approve/Reject files)
- [ ] Build the Directory Moderation queue (Pending courses/lecturers)
- [ ] Integrate the merge tool UI for duplicate resolution
- [ ] Build user management and suspension tools

## Phase 6: Launch & Deployment

- [ ] Perform application performance optimization
- [ ] Manual data extraction/seeding for the first target faculty
- [ ] Deploy Backend and Database
- [ ] Deploy Frontend
- [ ] Beta testing with select Class Reps and SUG members
