import { redirect } from "next/navigation";

// The tool now lives on the landing page — one unified experience.
export default function ToolPage() {
  redirect("/");
}
