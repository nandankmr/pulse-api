/// <reference types="multer" />

declare global {
  namespace Express {
    // Multer types are already defined in @types/multer
    // This just ensures they're available globally
  }
}

export {};
