import { createActor } from "xstate";
import { describe, expect, it } from "vitest";

import {
  createWizardFlowMachine,
  getWizardFlowStep,
  isWizardFlowBusy,
  isWizardFlowComplete,
} from "./wizard-flow-machine";
import type { MoveWiseReviewModel } from "./review-model";

const reviewModel = {
  routeLabel: "Los Angeles to Seattle",
} as MoveWiseReviewModel;

const createFlow = (
  initialStep?: Parameters<typeof createWizardFlowMachine>[0],
  initialReviewModel?: Parameters<typeof createWizardFlowMachine>[1],
) => {
  const actor = createActor(
    createWizardFlowMachine(initialStep, initialReviewModel),
  );
  actor.start();
  return actor;
};

describe("wizardFlowMachine", () => {
  it("moves through the validated wizard path into review and completion", () => {
    const flow = createFlow();

    expect(flow.getSnapshot().value).toBe("move");

    flow.send({ type: "CONTINUE_TO_MONEY" });
    flow.send({ type: "CONTINUE_TO_FIRST_HOME" });
    flow.send({ type: "CONTINUE_TO_PRIORITIES" });
    flow.send({ type: "CONTINUE_TO_HOUSEHOLD" });
    flow.send({ type: "CONTINUE_TO_REVIEW", reviewModel });

    expect(flow.getSnapshot().value).toBe("review");
    expect(flow.getSnapshot().context.reviewModel).toBe(reviewModel);

    flow.send({ type: "START_EVALUATION" });
    expect(flow.getSnapshot().value).toBe("evaluating");
    expect(isWizardFlowBusy(flow.getSnapshot().value)).toBe(true);
    expect(getWizardFlowStep(flow.getSnapshot().value)).toBe("review");

    flow.send({ type: "EVALUATION_COMPLETE" });

    expect(flow.getSnapshot().value).toBe("comparisonReady");
    expect(isWizardFlowComplete(flow.getSnapshot().value)).toBe(true);
    expect(getWizardFlowStep(flow.getSnapshot().value)).toBe("review");
  });

  it("keeps users on the current state when validation fails", () => {
    const flow = createFlow();

    flow.send({
      type: "VALIDATION_FAILED",
      errors: { originSlug: "Choose your current location." },
    });

    expect(flow.getSnapshot().value).toBe("move");
    expect(flow.getSnapshot().context.errors).toEqual({
      originSlug: "Choose your current location.",
    });

    flow.send({ type: "CONTINUE_TO_MONEY" });
    expect(flow.getSnapshot().value).toBe("money");
    expect(flow.getSnapshot().context.errors).toEqual({});
  });

  it("returns failed evaluations to review with the evaluator errors", () => {
    const flow = createFlow("review");

    flow.send({ type: "START_EVALUATION" });
    flow.send({
      type: "EVALUATION_FAILED",
      errors: { scenario: "MoveWise could not verify this result." },
    });

    expect(flow.getSnapshot().value).toBe("review");
    expect(flow.getSnapshot().context.errors).toEqual({
      scenario: "MoveWise could not verify this result.",
    });
  });

  it("supports editing assumptions and resetting from later states", () => {
    const flow = createFlow("review");

    flow.send({ type: "EDIT_ASSUMPTIONS" });
    expect(flow.getSnapshot().value).toBe("money");

    flow.send({ type: "CONTINUE_TO_FIRST_HOME" });
    flow.send({ type: "CONTINUE_TO_PRIORITIES" });
    flow.send({ type: "RESET" });

    expect(flow.getSnapshot().value).toBe("move");
    expect(flow.getSnapshot().context.reviewModel).toBeNull();
    expect(flow.getSnapshot().context.errors).toEqual({});
  });

  it("returns a direct Budget edit to review with one rebuilt model", () => {
    const flow = createFlow("review", reviewModel);
    const rebuiltReviewModel = {
      routeLabel: "Los Angeles to Seattle — updated",
    } as MoveWiseReviewModel;

    flow.send({ type: "EDIT_ASSUMPTIONS" });
    flow.send({ type: "RETURN_TO_REVIEW", reviewModel: rebuiltReviewModel });

    expect(flow.getSnapshot().value).toBe("review");
    expect(flow.getSnapshot().context.reviewModel).toBe(rebuiltReviewModel);
  });

  it("routes First home and Household edits directly back to review", () => {
    const firstHomeFlow = createFlow("review", reviewModel);
    firstHomeFlow.send({ type: "EDIT_FIRST_HOME" });
    expect(firstHomeFlow.getSnapshot().value).toBe("firstHome");
    firstHomeFlow.send({ type: "RETURN_TO_REVIEW", reviewModel });
    expect(firstHomeFlow.getSnapshot().value).toBe("review");

    const householdFlow = createFlow("review", reviewModel);
    householdFlow.send({ type: "EDIT_HOUSEHOLD" });
    expect(householdFlow.getSnapshot().value).toBe("household");
    householdFlow.send({ type: "RETURN_TO_REVIEW", reviewModel });
    expect(householdFlow.getSnapshot().value).toBe("review");
  });

  it("restores a review state with its deterministically rebuilt model", () => {
    const flow = createFlow("review", reviewModel);

    expect(flow.getSnapshot().value).toBe("review");
    expect(flow.getSnapshot().context.reviewModel).toBe(reviewModel);
  });
});
