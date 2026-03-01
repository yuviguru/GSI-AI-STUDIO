import type { Handler, HandlerEvent } from "@netlify/functions";
import crypto from "crypto";

const GITHUB_REPO = "yuviguru/GSI-AI-STUDIO";

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
  labels: string[];
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

  // Trigger only when issue is assigned (prevents duplicate runs)
  const isAssignment =
    action === "update" &&
    payload.updatedFrom?.assigneeId !== undefined &&
    data.assignee;

  if (!isAssignment) {
    return {
      statusCode: 200,
      body: "Ignored: not an assignment event",
    };
  }

  const triggerReason = `Assigned to: ${data.assignee.name || data.assignee.id}`;

  // Trigger GitHub Action
  try {
    const labels = Array.isArray(data.labels)
      ? (data.labels as Array<{ name: string }>).map((l) => l.name)
      : [];

    await triggerGitHubAction({
      issue_id: data.identifier || data.id,
      title: data.title || "Untitled",
      description: data.description || "",
      labels,
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
