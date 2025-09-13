# YouTube Video Analyzer

## Overview

This is a YouTube video analysis application built with a modern full-stack architecture. The app allows users to input YouTube video URLs and retrieve detailed metadata including title, description, thumbnails, download links, and video statistics. It features a React frontend with shadcn/ui components, an Express.js backend API, and uses the @distube/ytdl-core library for YouTube video processing.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **React 18** with TypeScript for type safety and modern React features
- **Vite** as the build tool and development server for fast hot module replacement
- **shadcn/ui** component library built on Radix UI primitives for accessible, customizable components
- **Tailwind CSS** for utility-first styling with custom design system variables
- **TanStack Query** for server state management, caching, and API interactions
- **Wouter** as a lightweight client-side routing solution
- **React Hook Form** with Zod validation for form handling and validation

### Backend Architecture
- **Express.js** REST API server with TypeScript
- **@distube/ytdl-core** library for YouTube video metadata extraction and download URL generation
- **CORS** middleware for cross-origin resource sharing
- **Zod** schemas for request/response validation and type safety
- **ESBuild** for production bundling of the server code

### Data Management
- **Drizzle ORM** configured for PostgreSQL with schema migrations
- **Neon Database** as the PostgreSQL hosting solution
- **Session management** using connect-pg-simple for PostgreSQL-backed sessions
- **Schema-first approach** with shared TypeScript types between frontend and backend

### Development Tools
- **TypeScript** throughout the entire stack for type safety
- **Path mapping** configured for clean imports (@/, @shared/, @assets/)
- **Hot module replacement** in development with Vite
- **Replit integration** with development banners and cartographer plugin

### API Design
- **RESTful endpoint** structure with `/api` prefix
- **POST /api/analyze** endpoint that accepts YouTube URLs and returns video metadata
- **Structured error handling** with consistent JSON response format
- **Request validation** using Zod schemas for type-safe API contracts

### UI/UX Architecture
- **Responsive design** with mobile-first approach using Tailwind breakpoints
- **Dark/light theme support** with CSS custom properties and theme provider
- **Accessible components** built on Radix UI primitives
- **Toast notifications** for user feedback on actions
- **Loading states** and error handling for better user experience

## External Dependencies

### Core Services
- **YouTube API** integration via @distube/ytdl-core for video metadata extraction
- **Neon Database** for PostgreSQL hosting and connection pooling
- **Replit** platform integration for development environment

### Key Libraries
- **@radix-ui/* components** - Accessible UI primitives for dialogs, dropdowns, forms, etc.
- **@tanstack/react-query** - Server state management and caching
- **@distube/ytdl-core** - YouTube video information extraction
- **drizzle-orm** with **@neondatabase/serverless** - Database ORM and connection
- **zod** - Runtime type validation and schema definition
- **tailwindcss** - Utility-first CSS framework
- **class-variance-authority** - Utility for creating variant-based component APIs

### Development Tools
- **@replit/vite-plugin-*** - Replit-specific development plugins
- **tsx** - TypeScript execution for development
- **esbuild** - Fast JavaScript/TypeScript bundler for production builds