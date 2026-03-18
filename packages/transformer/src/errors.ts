export class TransformerError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = 'TransformerError';
    this.code = code;
  }
}

export class ParseError extends TransformerError {
  constructor(message: string) {
    super('PARSE_ERROR', message);
    this.name = 'ParseError';
  }
}

export class ValidationError extends TransformerError {
  constructor(message: string) {
    super('VALIDATION_ERROR', message);
    this.name = 'ValidationError';
  }
}

export class ResolveError extends TransformerError {
  constructor(message: string) {
    super('RESOLVE_ERROR', message);
    this.name = 'ResolveError';
  }
}

export class TransformError extends TransformerError {
  constructor(message: string) {
    super('TRANSFORM_ERROR', message);
    this.name = 'TransformError';
  }
}
