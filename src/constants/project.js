export const PROJECT_STAGES = [
  "Not Started",
  "Requirement Gathering",
  "Planning",
  "Development",
  "Internal Testing",
  "Client Testing",
  "Review",
  "Ready for Deployment",
  "Deployed",
  "Completed",
  "On Hold",
  "Blocked",
  "Cancelled",
];

export const PRIORITIES = ["Low", "Medium", "High", "Urgent"];

export const ZOHO_PRODUCTS = [
  "General Project",
  "Zoho CRM",
  "Zoho Books",
  "Zoho Creator",
  "Zoho Desk",
  "Zoho Analytics",
  "Zoho Flow",
  "Zoho Sign",
  "Other",
];

export const PROJECT_TYPES = [
  "General",
  "Client Project",
  "Personal Project",
  "Website",
  "Mobile App",
  "Internal Tool",
  "Research",
  "Operations",
  "Workflow",
  "Custom Function",
  "Webhook",
  "Blueprint",
  "API Integration",
  "Third-party Integration",
  "Custom Module",
  "Validation Rule",
  "Scheduled Function",
  "Widget",
  "Bug Fix",
  "Data Migration",
  "Other",
];

export const ENVIRONMENTS = ["Not Applicable", "Sandbox", "Production", "Both"];

export const PROJECT_TEMPLATES = {
  workflow: {
    label: "Workflow customization",
    tasks: [
      "Understand requirement",
      "Identify module and fields",
      "Confirm field API names",
      "Configure workflow conditions",
      "Write custom function",
      "Test using sample record",
      "Handle null values",
      "Test negative conditions",
      "Deploy to production",
      "Add documentation",
    ],
  },
  webhook: {
    label: "Webhook integration",
    tasks: [
      "Review webhook documentation",
      "Create webhook endpoint",
      "Log raw request",
      "Parse payload",
      "Validate event type",
      "Extract required IDs",
      "Fetch Zoho record",
      "Create or update record",
      "Prevent duplicates",
      "Handle errors",
      "Test sample payload",
      "Test actual webhook",
      "Deploy",
      "Document field mappings",
    ],
  },
  blueprint: {
    label: "Blueprint",
    tasks: [
      "Identify Blueprint",
      "Identify current state",
      "Find transition ID",
      "Validate mandatory fields",
      "Prepare transition payload",
      "Test API request",
      "Check transition response",
      "Handle transition failure",
      "Deploy",
      "Document transition logic",
    ],
  },
};
