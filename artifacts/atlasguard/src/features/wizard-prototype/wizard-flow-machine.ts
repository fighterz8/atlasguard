import { assign, setup } from "xstate";

import type { MoveWiseReviewModel } from "./review-model";
import type { WizardErrors, WizardStepId } from "./model";

export type WizardFlowStateValue =
  | WizardStepId
  | "evaluating"
  | "comparisonReady";

export type WizardFlowContext = {
  errors: WizardErrors;
  reviewModel: MoveWiseReviewModel | null;
};

export type WizardFlowEvent =
  | { type: "CONTINUE_TO_MONEY" }
  | { type: "CONTINUE_TO_FIRST_HOME" }
  | { type: "CONTINUE_TO_PRIORITIES" }
  | { type: "CONTINUE_TO_HOUSEHOLD" }
  | { type: "CONTINUE_TO_REVIEW"; reviewModel: MoveWiseReviewModel }
  | { type: "VALIDATION_FAILED"; errors: WizardErrors }
  | { type: "CLEAR_ERROR"; key: string }
  | { type: "START_EVALUATION" }
  | { type: "EVALUATION_FAILED"; errors: WizardErrors }
  | { type: "EVALUATION_COMPLETE" }
  | { type: "EDIT_ASSUMPTIONS" }
  | { type: "EDIT_FIRST_HOME" }
  | { type: "EDIT_HOUSEHOLD" }
  | { type: "RETURN_TO_REVIEW"; reviewModel: MoveWiseReviewModel }
  | { type: "BACK" }
  | { type: "RESET" }
  | { type: "DRAFT_CHANGED" };

const wizardFlowMachineSetup = setup({
  types: {
    context: {} as WizardFlowContext,
    events: {} as WizardFlowEvent,
  },
});

export const createWizardFlowMachine = (
  initialStep: WizardStepId = "move",
  initialReviewModel: MoveWiseReviewModel | null = null,
) =>
  wizardFlowMachineSetup.createMachine({
    id: "moveWiseWizardFlow",
    initial: initialStep,
    context: {
      errors: {},
      reviewModel: initialReviewModel,
    },
    on: {
      RESET: {
        target: ".move",
        actions: assign({
          errors: {},
          reviewModel: null,
        }),
      },
      VALIDATION_FAILED: {
        actions: assign({
          errors: ({ event }) => event.errors,
        }),
      },
      CLEAR_ERROR: {
        actions: assign({
          errors: ({ context, event }) => {
            if (!(event.key in context.errors)) return context.errors;
            const next = { ...context.errors };
            delete next[event.key];
            return next;
          },
        }),
      },
      DRAFT_CHANGED: {
        actions: assign({
          errors: {},
        }),
      },
    },
    states: {
      move: {
        on: {
          CONTINUE_TO_MONEY: {
            target: "money",
            actions: assign({
              errors: {},
            }),
          },
        },
      },
      money: {
        on: {
          RETURN_TO_REVIEW: {
            target: "review",
            actions: assign({
              errors: {},
              reviewModel: ({ event }) => event.reviewModel,
            }),
          },
          BACK: {
            target: "move",
            actions: assign({
              errors: {},
            }),
          },
          CONTINUE_TO_FIRST_HOME: {
            target: "firstHome",
            actions: assign({
              errors: {},
            }),
          },
        },
      },
      firstHome: {
        on: {
          RETURN_TO_REVIEW: {
            target: "review",
            actions: assign({
              errors: {},
              reviewModel: ({ event }) => event.reviewModel,
            }),
          },
          BACK: {
            target: "money",
            actions: assign({
              errors: {},
            }),
          },
          CONTINUE_TO_PRIORITIES: {
            target: "priorities",
            actions: assign({
              errors: {},
            }),
          },
        },
      },
      priorities: {
        on: {
          BACK: {
            target: "firstHome",
            actions: assign({
              errors: {},
            }),
          },
          CONTINUE_TO_HOUSEHOLD: {
            target: "household",
            actions: assign({
              errors: {},
            }),
          },
        },
      },
      household: {
        on: {
          RETURN_TO_REVIEW: {
            target: "review",
            actions: assign({
              errors: {},
              reviewModel: ({ event }) => event.reviewModel,
            }),
          },
          BACK: {
            target: "priorities",
            actions: assign({
              errors: {},
            }),
          },
          CONTINUE_TO_REVIEW: {
            target: "review",
            actions: assign({
              errors: {},
              reviewModel: ({ event }) => event.reviewModel,
            }),
          },
        },
      },
      review: {
        on: {
          BACK: {
            target: "household",
            actions: assign({
              errors: {},
            }),
          },
          EDIT_ASSUMPTIONS: {
            target: "money",
            actions: assign({
              errors: {},
            }),
          },
          EDIT_FIRST_HOME: {
            target: "firstHome",
            actions: assign({ errors: {} }),
          },
          EDIT_HOUSEHOLD: {
            target: "household",
            actions: assign({ errors: {} }),
          },
          START_EVALUATION: {
            target: "evaluating",
            actions: assign({
              errors: {},
            }),
          },
        },
      },
      evaluating: {
        on: {
          EVALUATION_FAILED: {
            target: "review",
            actions: assign({
              errors: ({ event }) => event.errors,
            }),
          },
          EVALUATION_COMPLETE: {
            target: "comparisonReady",
            actions: assign({
              errors: {},
            }),
          },
        },
      },
      comparisonReady: {
        on: {
          BACK: {
            target: "review",
            actions: assign({
              errors: {},
            }),
          },
          EDIT_ASSUMPTIONS: {
            target: "money",
            actions: assign({
              errors: {},
            }),
          },
        },
      },
    },
  });

export const wizardFlowMachine = createWizardFlowMachine();

export function getWizardFlowStep(value: WizardFlowStateValue): WizardStepId {
  if (value === "evaluating" || value === "comparisonReady") return "review";
  return value;
}

export function isWizardFlowBusy(value: WizardFlowStateValue) {
  return value === "evaluating";
}

export function isWizardFlowComplete(value: WizardFlowStateValue) {
  return value === "comparisonReady";
}
