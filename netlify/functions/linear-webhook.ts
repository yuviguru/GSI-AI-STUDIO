import type { Handler, HandlerEvent } from "@netlify/functions";
import crypto from "crypto";

const GITHUB_REPO = "yuviguru/GSI-AI-STUDIO";

// Phase labels that should trigger Claude Code
const TRIGGER_LABELS = ["Phase 1.5", "Phase 2", "Phase 3", "Bug"];

// Verify Linear webhook signature
function verifySignature(body: string, signature: string, secret: string): boolean {
  const hmac = crypto.createHmac("sha256", secret);
  hmac.update(body);
  const digest = hmac.digest("hex");
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(digest));
}

// Trigger GitHub Actions via repository_dispatch
async function triggerGitHubAction(issueData: {
  issue_id: string;
  title: string;
  description: string;
}) {
  const githubPat = process.env.GITHUB_PAT;
  if (!githubPat) throw new Error("GITHUB_PAT not configured");

  const response = await fetch(
    `https://api.github.com/repos/${GITHUB_REPO}/dispatches`,
    {
      method: "POST",
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${githubPat}`,
        "X-GitHub-Api-Version": "2022-11-28",
      },
      body: JSON.stringify({
        event_type: "linear-issue",
        client_payload: issueData,
      }),
    }
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`GitHub API error ${response.status}: ${text}`);
  }
}

const handler: Handler = async (event: HandlerEvent) => {
  // Only accept POST
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method not allowed" };
  }

  const body = event.body;
  if (!body) {
    return { statusCode: 400, body: "Empty body" };
  }

  // Verify webhook signature
  const signature = event.headers["linear-signature"];
  const webhookSecret = process.env.LINEAR_WEBHOOK_SECRET;

  if (webhookSecret && signature) {
    if (!verifySignature(body, signature, webhookSecret)) {
      return { statusCode: 401, body: "Invalid signature" };
    }
  }

  const payload = JSON.parse(body);
  const { action, type, data } = payload;

  // Only process Issue updates
  if (type !== "Issue") {
    return { statusCode: 200, body: "Ignored: not an issue event" };
  }

  // Trigger on:
  // 1. Issue label added (matching a phase label)
  // 2. Issue assigned (any assignment change)
  let shouldTrigger = false;
  let triggerReason = "";

  // Check if a trigger label was added
  if (data.labelIds && Array.isArray(data.labels)) {
    const labels = data.labels as Array<{ name: string }>;
    const hasPhaseLabel = labels.some((l) => TRIGGER_LABELS.includes(l.name));
    if (hasPhaseLabel) {
      shouldTrigger = true;
      triggerReason = `Label matched: ${labels.map((l) => l.name).join(", ")}`;
    }
  }

  // Check if issue was just assigned
  if (action === "update" && payload.updatedFrom?.assigneeId !== undefined) {
    if (data.assignee) {
      shouldTrigger = true;
      triggerReason = `Assigned to: ${data.assignee.name || data.assignee.id}`;
    }
  }

  if (!shouldTrigger) {
    return {
      statusCode: 200,
      body: "Ignored: no trigger condition met",
    };
  }

  // Trigger GitHub Action
  try {
    await triggerGitHubAction({
      issue_id: data.identifier || data.id,
      title: data.title || "Untitled",
      description: data.description || "",
    });

    console.log(
      `Triggered GitHub Action for ${data.identifier}: ${triggerReason}`
    );

    return {
      statusCode: 200,
      body: JSON.stringify({
        triggered: true,
        issue: data.identifier,
        reason: triggerReason,
      }),
    };
  } catch (error) {
    console.error("Failed to trigger GitHub Action:", error);
    return {
      statusCode: 500,
      body: `Failed to trigger: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
};

export { handler };
