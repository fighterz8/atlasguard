import type {
  MoveWiseHouseholdFactorId,
  MoveWiseHouseholdMode,
} from "@workspace/contracts";

export type HouseholdConstraintKey =
  | "supportNetwork"
  | "childcare"
  | "school"
  | "requiredServices"
  | "carFreeAccess";

export type HouseholdConstraintRelevance = "yes" | "no" | "";
export type HouseholdConstraintImportance = "important" | "blocker" | "";
export type HouseholdConstraintStatus =
  | "works"
  | "does_not_work"
  | "not_checked"
  | "";

export type HouseholdConstraint = {
  relevance: HouseholdConstraintRelevance;
  importance: HouseholdConstraintImportance;
  status: HouseholdConstraintStatus;
};

export type HouseholdConstraintDefinition = Readonly<{
  key: HouseholdConstraintKey;
  factorId: Exclude<MoveWiseHouseholdFactorId, "space_fit">;
  label: string;
  detail: string;
  applies: boolean;
  notApplicableReason: string | null;
}>;

const definitions = [
  {
    key: "supportNetwork",
    factorId: "support_network",
    label: "Nearby support",
    detail: "Friends, family, or trusted people who can help with daily life.",
    familyOnly: false,
  },
  {
    key: "childcare",
    factorId: "childcare_continuity",
    label: "Workable childcare",
    detail: "Care arrangements that need to keep working after the move.",
    familyOnly: true,
  },
  {
    key: "school",
    factorId: "school_continuity",
    label: "Suitable school path",
    detail: "School continuity or a new school path that has to be viable.",
    familyOnly: true,
  },
  {
    key: "requiredServices",
    factorId: "required_services_continuity",
    label: "Required services",
    detail: "Healthcare, therapy, specialist, or other recurring services.",
    familyOnly: false,
  },
  {
    key: "carFreeAccess",
    factorId: "car_free_access",
    label: "Car-free routines",
    detail: "Daily routines that need to work without reliable car access.",
    familyOnly: false,
  },
] as const;

export const createInitialHouseholdConstraint = (): HouseholdConstraint => ({
  relevance: "",
  importance: "",
  status: "",
});

export const getHouseholdConstraintDefinitions = (
  mode: MoveWiseHouseholdMode | "",
): readonly HouseholdConstraintDefinition[] =>
  definitions.map(({ familyOnly, ...definition }) => {
    const applies = !familyOnly || mode === "family";
    return {
      ...definition,
      applies,
      notApplicableReason: applies ? null : "Not asked for an individual move.",
    };
  });

export const getHouseholdConstraintDefinition = (key: HouseholdConstraintKey) =>
  definitions.find((definition) => definition.key === key)!;

export const getHouseholdConstraintDefinitionByFactorId = (
  factorId: Exclude<MoveWiseHouseholdFactorId, "space_fit">,
) => definitions.find((definition) => definition.factorId === factorId)!;

export const validateHouseholdConstraint = (
  key: HouseholdConstraintKey,
  constraint: HouseholdConstraint,
): Record<string, string> => {
  const { label } = getHouseholdConstraintDefinition(key);
  const fieldPrefix = `householdPlan.${key}`;
  if (constraint.relevance === "") {
    return {
      [`${fieldPrefix}.relevance`]: `Choose whether ${label.toLowerCase()} is relevant to this move.`,
    };
  }
  if (constraint.relevance === "no") return {};

  const errors: Record<string, string> = {};
  if (constraint.importance === "") {
    errors[`${fieldPrefix}.importance`] =
      `Choose whether ${label.toLowerCase()} is important or could block the move.`;
  }
  if (constraint.status === "") {
    errors[`${fieldPrefix}.status`] =
      `Choose whether ${label.toLowerCase()} works, does not work, or has not been checked.`;
  }
  return errors;
};
