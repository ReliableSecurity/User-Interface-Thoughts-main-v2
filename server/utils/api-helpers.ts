import type { Request, Response } from "express";
import { ZodSchema, ZodError } from "zod";

export interface ApiError {
  error: string;
  details?: unknown;
}

export function parseBody<T>(
  schema: ZodSchema<T>,
  body: unknown
): { success: true; data: T } | { success: false; error: ZodError } {
  const result = schema.safeParse(body);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: result.error };
}

export function sendValidationError(res: Response, error: ZodError): void {
  res.status(400).json({
    error: "Ошибка валидации",
    details: error.errors.map(e => ({
      field: e.path.join("."),
      message: e.message,
    })),
  });
}

export function sendNotFound(res: Response, resource: string): void {
  res.status(404).json({ error: `${resource} не найден` });
}

export function sendServerError(res: Response, message: string, error?: unknown): void {
  console.error(message, error);
  res.status(500).json({ error: message });
}

export function sendSuccess<T>(res: Response, data: T, status = 200): void {
  res.status(status).json(data);
}

export function sendCreated<T>(res: Response, data: T): void {
  res.status(201).json(data);
}

export function sendNoContent(res: Response): void {
  res.status(204).send();
}

export async function handleCrudOperation<T>(
  res: Response,
  operation: () => Promise<T | null | undefined>,
  options: {
    notFoundMessage?: string;
    errorMessage?: string;
    successStatus?: number;
  } = {}
): Promise<void> {
  try {
    const result = await operation();
    if (result === null || result === undefined) {
      sendNotFound(res, options.notFoundMessage || "Ресурс");
      return;
    }
    sendSuccess(res, result, options.successStatus);
  } catch (error) {
    sendServerError(res, options.errorMessage || "Ошибка операции", error);
  }
}

export async function handleCreateOperation<T, S>(
  req: Request,
  res: Response,
  schema: ZodSchema<S>,
  createFn: (data: S) => Promise<T>,
  errorMessage: string
): Promise<void> {
  const parsed = parseBody(schema, req.body);
  if (!parsed.success) {
    sendValidationError(res, parsed.error);
    return;
  }

  try {
    const result = await createFn(parsed.data);
    sendCreated(res, result);
  } catch (error) {
    sendServerError(res, errorMessage, error);
  }
}

export async function handleUpdateOperation<T, S>(
  req: Request,
  res: Response,
  schema: ZodSchema<S>,
  updateFn: (id: string, data: S) => Promise<T | null | undefined>,
  resourceName: string
): Promise<void> {
  const parsed = parseBody(schema, req.body);
  if (!parsed.success) {
    sendValidationError(res, parsed.error);
    return;
  }

  const id = req.params.id as string;
  try {
    const result = await updateFn(id, parsed.data);
    if (!result) {
      sendNotFound(res, resourceName);
      return;
    }
    sendSuccess(res, result);
  } catch (error) {
    sendServerError(res, `Ошибка обновления ${resourceName.toLowerCase()}`, error);
  }
}

export async function handleDeleteOperation(
  req: Request,
  res: Response,
  deleteFn: (id: string) => Promise<void>,
  resourceName: string
): Promise<void> {
  const id = req.params.id as string;
  try {
    await deleteFn(id);
    sendNoContent(res);
  } catch (error) {
    sendServerError(res, `Ошибка удаления ${resourceName.toLowerCase()}`, error);
  }
}
