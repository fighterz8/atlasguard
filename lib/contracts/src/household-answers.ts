import { z } from "zod/v4";

import { sha256Hex, sortJsonKeys } from "./canonical-json";
import { Sha256Schema } from "./primitives";

export const MOVEWISE_HOUSEHOLD_ANSWER_SCHEMA_VERSION = "1.0.0" as const;
export const MOVEWISE_HOUSEHOLD_QUESTION_VERSION = "1.0.0" as const;

export const MoveWiseHouseholdModeSchema = z.enum(["individual", "family"]);

export const MoveWiseHouseholdFactorIdSchema = z.enum([
  "space_fit",
  "support_network",
  "childcare_continuity",
  "school_continuity",
  "required_services_continuity",
  "car_free_access",
]);

export const MOVEWISE_HOUSEHOLD_FACTOR_IDS_BY_MODE = Object.freeze({
  individual: Object.freeze([
    "space_fit",
    "support_network",
    "required_services_continuity",
    "car_free_access",
  ] as const),
  family: Object.freeze([
    "space_fit",
    "support_network",
    "childcare_continuity",
    "school_continuity",
    "required_services_continuity",
    "car_free_access",
  ] as const),
});

export const MoveWiseHouseholdImpactSchema = z.enum([
  "strong_negative",
  "negative",
  "neutral",
  "positive",
  "strong_positive",
  "unavailable",
  "excluded",
]);

export const MoveWiseHouseholdFactorAnswerSchema = z
  .object({
    factorId: MoveWiseHouseholdFactorIdSchema,
    importance: z.enum(["important", "essential", "not_applicable"]),
    impact: MoveWiseHouseholdImpactSchema,
    essentialStatus: z
      .enum(["confirmed_met", "confirmed_unmet", "unconfirmed"])
      .nullable(),
  })
  .strict()
  .superRefine((answer, context) => {
    if (
      answer.importance === "not_applicable" &&
      (answer.impact !== "excluded" || answer.essentialStatus !== null)
    ) {
      context.addIssue({
        code: "custom",
        message:
          "A not-applicable household factor must be excluded and cannot have an essential status.",
        path: ["importance"],
      });
    }
    if (
      answer.importance === "important" &&
      (answer.impact === "excluded" || answer.essentialStatus !== null)
    ) {
      context.addIssue({
        code: "custom",
        message:
          "An important household factor requires a non-excluded impact and cannot have an essential status.",
        path: ["importance"],
      });
    }
    if (
      answer.importance === "essential" &&
      (answer.impact === "excluded" || answer.essentialStatus === null)
    ) {
      context.addIssue({
        code: "custom",
        message:
          "An essential household factor requires a non-excluded impact and an essential status.",
        path: ["importance"],
      });
    }
  });

const householdAnswerFields = {
  schemaVersion: z.literal(MOVEWISE_HOUSEHOLD_ANSWER_SCHEMA_VERSION),
  questionVersion: z.literal(MOVEWISE_HOUSEHOLD_QUESTION_VERSION),
  mode: MoveWiseHouseholdModeSchema,
  factors: z.array(MoveWiseHouseholdFactorAnswerSchema),
} as const;

const validateFactors = (
  answers: {
    mode: "individual" | "family";
    factors: readonly { factorId: string }[];
  },
  context: z.core.$RefinementCtx,
) => {
  const expected = MOVEWISE_HOUSEHOLD_FACTOR_IDS_BY_MODE[answers.mode];
  const actual = answers.factors.map(({ factorId }) => factorId);
  if (
    actual.length !== expected.length ||
    actual.some((factorId, index) => factorId !== expected[index])
  ) {
    context.addIssue({
      code: "custom",
      message:
        "Household factors must include every mode-applicable factor exactly once in canonical order.",
      path: ["factors"],
    });
  }
};

export const MoveWiseHouseholdAnswerPayloadSchema = z
  .object(householdAnswerFields)
  .strict()
  .superRefine(validateFactors);

export const MoveWiseHouseholdAnswersSchema = z
  .object({
    ...householdAnswerFields,
    sha256: Sha256Schema,
  })
  .strict()
  .superRefine(validateFactors);

export type MoveWiseHouseholdMode = z.infer<typeof MoveWiseHouseholdModeSchema>;
export type MoveWiseHouseholdFactorId = z.infer<
  typeof MoveWiseHouseholdFactorIdSchema
>;
export type MoveWiseHouseholdAnswerPayload = z.infer<
  typeof MoveWiseHouseholdAnswerPayloadSchema
>;
export type MoveWiseHouseholdAnswers = z.infer<
  typeof MoveWiseHouseholdAnswersSchema
>;

type DeepReadonly<Value> = Value extends (...args: never[]) => unknown
  ? Value
  : Value extends readonly (infer Item)[]
    ? readonly DeepReadonly<Item>[]
    : Value extends object
      ? { readonly [Key in keyof Value]: DeepReadonly<Value[Key]> }
      : Value;

declare const verifiedMoveWiseHouseholdAnswersBrand: unique symbol;

export type VerifiedMoveWiseHouseholdAnswers =
  DeepReadonly<MoveWiseHouseholdAnswers> & {
    readonly [verifiedMoveWiseHouseholdAnswersBrand]: true;
  };

const payloadFrom = (
  input:
    | MoveWiseHouseholdAnswerPayload
    | MoveWiseHouseholdAnswers
    | VerifiedMoveWiseHouseholdAnswers,
): MoveWiseHouseholdAnswerPayload =>
  MoveWiseHouseholdAnswerPayloadSchema.parse({
    schemaVersion: input.schemaVersion,
    questionVersion: input.questionVersion,
    mode: input.mode,
    factors: input.factors,
  });

export const serializeMoveWiseHouseholdAnswersForChecksum = (
  input:
    | MoveWiseHouseholdAnswerPayload
    | MoveWiseHouseholdAnswers
    | VerifiedMoveWiseHouseholdAnswers,
): string => JSON.stringify(sortJsonKeys(payloadFrom(input)));

export const calculateMoveWiseHouseholdAnswersChecksum = (
  input:
    | MoveWiseHouseholdAnswerPayload
    | MoveWiseHouseholdAnswers
    | VerifiedMoveWiseHouseholdAnswers,
): string => sha256Hex(serializeMoveWiseHouseholdAnswersForChecksum(input));

export class MoveWiseHouseholdAnswerChecksumMismatchError extends Error {
  readonly expectedSha256: string;
  readonly actualSha256: string;

  constructor(expectedSha256: string, actualSha256: string) {
    super(
      `MoveWise household-answer checksum mismatch: expected ${expectedSha256}, received ${actualSha256}.`,
    );
    this.name = "MoveWiseHouseholdAnswerChecksumMismatchError";
    this.expectedSha256 = expectedSha256;
    this.actualSha256 = actualSha256;
  }
}

const deepFreeze = <Value>(value: Value): DeepReadonly<Value> => {
  if (value !== null && typeof value === "object") {
    Object.values(value).forEach((nestedValue) => deepFreeze(nestedValue));
    Object.freeze(value);
  }
  return value as DeepReadonly<Value>;
};

export const verifyMoveWiseHouseholdAnswers = (
  input: unknown,
): VerifiedMoveWiseHouseholdAnswers => {
  const answers = MoveWiseHouseholdAnswersSchema.parse(input);
  const actualSha256 = calculateMoveWiseHouseholdAnswersChecksum(answers);
  if (actualSha256 !== answers.sha256) {
    throw new MoveWiseHouseholdAnswerChecksumMismatchError(
      answers.sha256,
      actualSha256,
    );
  }
  return deepFreeze(answers) as VerifiedMoveWiseHouseholdAnswers;
};

export const createMoveWiseHouseholdAnswers = (
  input: MoveWiseHouseholdAnswerPayload,
): VerifiedMoveWiseHouseholdAnswers => {
  const payload = MoveWiseHouseholdAnswerPayloadSchema.parse(input);
  return verifyMoveWiseHouseholdAnswers({
    ...payload,
    sha256: calculateMoveWiseHouseholdAnswersChecksum(payload),
  });
};
