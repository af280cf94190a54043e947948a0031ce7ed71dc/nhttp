import { z, ZodSchema } from "https://esm.sh/zod@3.21.4";
import { joinHandlers, TDecorator } from "./controller.ts";
import { Handler, HttpError, TRet } from "./deps.ts";

export function validate<
  S extends string = "body",
  T extends unknown = unknown,
>(
  schema: ZodSchema<T>,
  target = <S> "body",
): Handler<{ [k in S]: T }> {
  return (rev, next) => {
    try {
      schema.parse(rev[target]);
      return next();
    } catch (e) {
      throw new HttpError(422, e.errors);
    }
  };
}
export function Validate(
  schema: ZodSchema,
  target = "body",
): TDecorator {
  return (tgt: TRet, prop: string, des: PropertyDescriptor) => {
    joinHandlers(tgt.constructor.name, prop, [validate(schema, target)]);
    return des;
  };
}
export { z };
export default validate;
