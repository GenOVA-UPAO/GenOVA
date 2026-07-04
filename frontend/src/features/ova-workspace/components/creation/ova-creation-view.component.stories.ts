import type { Meta, StoryObj } from "@storybook/angular";
import { http, HttpResponse } from "msw";

import { OvaCreationViewComponent } from "./ova-creation-view.component";

const EMPTY_UPLOADS_HANDLER = http.get("/api/uploads/temp", () => HttpResponse.json({ items: [] }));

const RUNNING_JOB_SNAPSHOT = {
  status: "running",
  ova_id: null,
  resources: [
    {
      id: "1",
      phase_type: "engage",
      phase_order: 0,
      resource_order: 0,
      resource_type: 1,
      status: "done",
    },
    {
      id: "2",
      phase_type: "explore",
      phase_order: 1,
      resource_order: 0,
      resource_type: 1,
      status: "running",
    },
  ],
};

const meta: Meta<OvaCreationViewComponent> = {
  component: OvaCreationViewComponent,
  title: "Features/OvaWorkspace/Creation/OvaCreationView",
  tags: ["autodocs"],
  parameters: {
    msw: {
      handlers: [EMPTY_UPLOADS_HANDLER],
    },
  },
};
export default meta;

type Story = StoryObj<OvaCreationViewComponent>;

/**
 * Idle state: the creation form (no job started yet). The underlying
 * services (OvaJobService, OvaCreationFlowService, OvaUploadsService) are
 * app-wide singletons with real signal state — this story shows their
 * natural initial state rather than trying to reset them per-story.
 */
export const Default: Story = {};

/**
 * With an initialJobId, ngOnInit calls flow.restore(jobId), which polls
 * GET /api/ova/jobs/:jobId (mocked below) to render the progress view.
 * The component also opens an SSE stream via fetch-event-source, which msw
 * doesn't intercept — it will fail silently and fall back to polling, which
 * is enough to render this story's static state.
 */
export const WithActiveJob: Story = {
  args: {
    initialJobId: "job-story-1",
  },
  parameters: {
    msw: {
      handlers: [
        EMPTY_UPLOADS_HANDLER,
        http.get("/api/ova/jobs/:jobId", () => HttpResponse.json(RUNNING_JOB_SNAPSHOT)),
      ],
    },
  },
};
